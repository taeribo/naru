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

@SpringBootTest
@AutoConfigureMockMvc
class FortuneApiTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void exposesEightCategoriesAndAllowsRepeatedReadings() throws Exception {
        mvc.perform(get("/api/fortunes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8));

        for (String code : new String[] {"LOVE", "WEALTH", "HEALTH", "CAREER", "FAMILY", "STUDY",
                "RELATIONSHIP", "GENERAL", "LOVE"}) {
            mvc.perform(get("/api/fortunes/{code}", code))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(jsonPath("$.code").value(code))
                    .andExpect(jsonPath("$.message").value(containsString("\n")));
        }
        mvc.perform(get("/api/fortunes/UNKNOWN")).andExpect(status().isNotFound());
    }
}
