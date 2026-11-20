package kr.naru.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WishControllerTest {
    private static final String AUTHOR = "a".repeat(32);
    private static final String VISITOR = "b".repeat(32);
    private static final String PATH = "/api/wishes";

    @Autowired
    private MockMvc mvc;

    @Test
    void sharesSubmittedWishesWithOtherVisitors() throws Exception {
        mvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"author\":\"%s\",\"message\":\"  모두 건강하기를  \"}".formatted(AUTHOR)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("모두 건강하기를"))
                .andExpect(jsonPath("$.author").doesNotExist());

        mvc.perform(get(PATH).param("author", VISITOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].message").value("모두 건강하기를"));

        mvc.perform(get(PATH).param("author", AUTHOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void rejectsBlankAndOversizeMessages() throws Exception {
        for (String message : new String[] { "   ", "x".repeat(121) }) {
            mvc.perform(post(PATH)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"author\":\"%s\",\"message\":\"%s\"}".formatted(AUTHOR, message)))
                    .andExpect(status().isBadRequest());
        }
    }
}
