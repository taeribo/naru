package kr.naru.wish;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.naru.api.WishController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WishPaginationTest {
    private static final String AUTHOR = "a".repeat(32);
    private static final String VISITOR = "b".repeat(32);

    private final WishStore store = new InMemoryWishStore();
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new WishController(store)).build();
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void loadsOlderPagesWithoutDuplicatesWhenNewWishesArrive() throws Exception {
        for (int index = 1; index <= 60; index++) {
            store.create(AUTHOR, "Wish " + index);
        }
        store.create(VISITOR, "My own wish");

        JsonNode latest = page(null);
        assertThat(latest.get("items").size()).isEqualTo(30);
        assertThat(latest.at("/items/0/message").asText()).isEqualTo("Wish 60");
        assertThat(latest.at("/items/29/message").asText()).isEqualTo("Wish 31");

        store.create(AUTHOR, "Wish 61");
        JsonNode older = page(latest.get("nextCursor").asText());
        assertThat(older.get("items").size()).isEqualTo(30);
        assertThat(older.at("/items/0/message").asText()).isEqualTo("Wish 30");
        assertThat(older.at("/items/29/message").asText()).isEqualTo("Wish 1");
        assertThat(older.get("nextCursor").isNull()).isTrue();

        var ids = new HashSet<String>();
        latest.get("items").forEach(item -> ids.add(item.get("id").asText()));
        older.get("items").forEach(item -> ids.add(item.get("id").asText()));
        assertThat(ids).hasSize(60);
        assertThat(page(null).at("/items/0/message").asText()).isEqualTo("Wish 61");
    }

    @Test
    void handlesEmptyListsAndRejectsMalformedCursors() throws Exception {
        JsonNode empty = page(null);
        assertThat(empty.get("items").isEmpty()).isTrue();
        assertThat(empty.get("nextCursor").isNull()).isTrue();

        mvc.perform(get("/api/wishes/page").param("author", VISITOR).param("cursor", "!invalid"))
                .andExpect(status().isBadRequest());
    }

    private JsonNode page(String cursor) throws Exception {
        var request = get("/api/wishes/page").param("author", VISITOR);
        if (cursor != null) {
            request.param("cursor", cursor);
        }
        var result = mvc.perform(request).andExpect(status().isOk()).andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray());
    }
}
