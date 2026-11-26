package kr.naru.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "NARU_FORTUNE_KEY_V1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
@AutoConfigureMockMvc
class FortuneApiTest {
    private static final String VISITOR_ID = "a7b7af5d-4bd9-437a-a744-baa9a929e182";

    @Autowired
    private MockMvc mvc;

    @Test
    void listsEightCategoriesAndProvidesPrivateDailyResults() throws Exception {
        mvc.perform(get("/api/fortunes/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[7].code").value("GROWTH"));

        for (String code : new String[] {"GENERAL", "LOVE", "WEALTH", "CAREER", "HEALTH", "FAMILY",
                "RELATIONSHIP", "GROWTH"}) {
            mvc.perform(get("/api/fortunes/daily").param("category", code).header("X-Visitor-Id", VISITOR_ID))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control", containsString("no-store")))
                    .andExpect(header().string("Cache-Control", containsString("private")))
                    .andExpect(jsonPath("$.category").value(code))
                    .andExpect(jsonPath("$.date").isString())
                    .andExpect(jsonPath("$.grade.hanja").isNotEmpty())
                    .andExpect(jsonPath("$.grade.name").isNotEmpty())
                    .andExpect(jsonPath("$.content").value(containsString("\n")));
        }
        mvc.perform(get("/api/fortunes/STUDY").header("X-Visitor-Id", VISITOR_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("GROWTH"));
    }

    @Test
    void rejectsUnsupportedCategoriesAndInvalidOrMissingVisitorIds() throws Exception {
        mvc.perform(get("/api/fortunes/daily").param("category", "UNKNOWN").header("X-Visitor-Id", VISITOR_ID))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/fortunes/daily").param("category", "LOVE"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/fortunes/daily").param("category", "LOVE").header("X-Visitor-Id", "invalid"))
                .andExpect(status().isBadRequest());
    }
}
