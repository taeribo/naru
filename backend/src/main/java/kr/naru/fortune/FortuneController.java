package kr.naru.fortune;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/fortunes")
class FortuneController {
    private final List<Entry> entries;

    FortuneController(ObjectMapper mapper) throws IOException {
        try (var in = new ClassPathResource("fortunes.json").getInputStream()) {
            entries = mapper.readValue(in, new TypeReference<>() {});
        }
    }

    @GetMapping
    List<Category> categories() {
        return entries.stream().map(entry -> new Category(entry.code(), entry.name())).toList();
    }

    @GetMapping("/{code}")
    ResponseEntity<Result> fortune(@PathVariable("code") String code) {
        Entry entry = entries.stream().filter(item -> item.code().equals(code)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String result = entry.results().get(ThreadLocalRandom.current().nextInt(entry.results().size()));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new Result(entry.code(), entry.name(), result));
    }

    record Entry(String code, String name, List<String> results) {}
    record Category(String code, String name) {}
    record Result(String code, String name, String message) {}
}
