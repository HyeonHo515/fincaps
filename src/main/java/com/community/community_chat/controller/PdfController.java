package com.community.community_chat.controller;

import com.community.community_chat.entity.PdfDocument;
import com.community.community_chat.entity.ReverseLearningLog;
import com.community.community_chat.entity.StudyMemo;
import com.community.community_chat.entity.SummaryNote;
import com.community.community_chat.entity.QuizQuestion;
import com.community.community_chat.service.LearningDataService;
import com.community.community_chat.service.PdfService;
import com.community.community_chat.service.SummaryService;
import com.community.community_chat.service.QuizQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PdfController {

    private final PdfService pdfService;
    private final SummaryService summaryService;
    private final LearningDataService learningDataService;
    private final QuizQuestionService quizQuestionService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> uploadPdf(@RequestPart("file") MultipartFile file) throws IOException {
        String extractedText;
        try {
            extractedText = pdfService.extractText(file);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("fileName", file.getOriginalFilename());
        response.put("textLength", extractedText.length());
        response.put("text", extractedText);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/summary")
    public ResponseEntity<String> summarize(@RequestBody String text) {
        return ResponseEntity.ok(summaryService.summarize(text));
    }

    @PostMapping("/upload-summary")
    public ResponseEntity<Map<String, Object>> uploadAndSummarize(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam("file") MultipartFile file) throws Exception {
        String text;
        try {
            text = pdfService.extractText(file);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
        PdfDocument pdf = learningDataService.savePdf(file.getOriginalFilename(), text);
        String summary = summaryService.summarize(text);
        Map<String, Object> quiz = summaryService.generateBlankQuiz(summary);

        String question = (String) quiz.get("question");
        String answer = (String) quiz.get("answer");
        SummaryNote note = learningDataService.saveSummary(userId, pdf.getId(), summary, question, answer);

        Map<String, Object> result = new HashMap<>();
        result.put("pdfId", pdf.getId());
        result.put("summaryId", note.getId());
        result.put("summary", summary);
        result.put("question", question);
        result.put("answer", answer);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/quiz")
    public ResponseEntity<Map<String, Object>> generateQuiz(@RequestBody String text) {
        try {
            return ResponseEntity.ok(summaryService.generateBlankQuiz(text));
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/reverse-question")
    public ResponseEntity<String> generateReverseQuestion(@RequestBody Map<String, String> request) {
        String reverseQuestion = summaryService.generateReverseQuestion(
                request.get("summary"),
                request.get("question"),
                request.get("answer"));
        return ResponseEntity.ok(reverseQuestion);
    }

    @PostMapping("/evaluate-answer")
    public ResponseEntity<String> evaluateAnswer(@RequestBody Map<String, String> request) {
        String feedback = summaryService.evaluateAnswer(
                request.get("summary"),
                request.get("reverseQuestion"),
                request.get("userAnswer"));
        return ResponseEntity.ok(feedback);
    }

    @GetMapping("/summaries")
    public ResponseEntity<List<SummaryNote>> getSummaries(
            @RequestHeader(value = "X-User-Id", required = false) String userId) { // 👈 헤더 추가

        // 유저 아이디가 없거나 비어있다면 기본값 처리
        if (userId == null || userId.isBlank()) {
            userId = "guest";
        }

        // 🌟 [중요] 모든 조회가 아니라 유저 아이디별로 조회하도록 서비스 메서드 변경
        // 💡 만약 서비스에 이 메서드가 없다면 2단계 코드를 참고하여 추가해야 합니다.
        List<SummaryNote> mySummaries = learningDataService.getSummariesByUserId(userId);

        return ResponseEntity.ok(mySummaries);
    }

    @GetMapping("/summary/{id}")
    public ResponseEntity<SummaryNote> getSummary(@PathVariable Long id) {
        return ResponseEntity.ok(learningDataService.getSummary(id));
    }

    @PostMapping("/save-summary")
    public ResponseEntity<String> saveSummary(
            @RequestHeader(value = "X-User-Id", required = false) String userId, // 헤더 수집
            @RequestBody Map<String, String> request) {

        Long pdfId = parseOptionalLong(request.get("pdfId"));
        String summary = request.get("summary");
        String question = request.get("question");
        String answer = request.get("answer");

        // 유저 아이디가 넘어오지 않은 경우 예외 방지용 기본값 처리
        if (userId == null || userId.isBlank()) {
            userId = "guest";
        }

        // 🌟 중요: 서비스 메서드를 호출할 때 첫 번째 인자로 userId를 조립해서 넘겨줍니다!
        SummaryNote note = learningDataService.saveSummary(userId, pdfId, summary, question, answer);

        return ResponseEntity.ok("Summary saved with ID: " + note.getId());
    }

    @PostMapping("/save-question")
    public ResponseEntity<QuizQuestion> saveQuestion(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "X-User-Id", defaultValue = "guest") String userId) {
        QuizQuestion quiz = quizQuestionService.saveQuestion(
                parseOptionalLong(request.get("summaryId")),
                request.get("question"),
                request.get("answer"),
                request.getOrDefault("questionType", "blank"),
                userId);

        return ResponseEntity.ok(quiz);
    }

    @PostMapping("/reverse-log")
    public ResponseEntity<ReverseLearningLog> saveReverseLog(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, String> request) {

        if (isGuestUser(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        ReverseLearningLog log = learningDataService.saveReverseLearningLog(
                parseOptionalLong(request.get("summaryId")),
                request.get("reverseQuestion"),
                request.get("userAnswer"),
                request.get("aiFeedback"));

        return ResponseEntity.ok(log);
    }

    @PostMapping("/memo")
    public ResponseEntity<StudyMemo> saveMemo(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, String> request) {
        if (isGuestUser(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        StudyMemo memo = learningDataService.saveMemo(
                userId,
                parseOptionalLong(request.get("summaryId")),
                request.get("memoContent"));

        return ResponseEntity.ok(memo);
    }

    @GetMapping("/memo/{summaryId}")
    public ResponseEntity<List<StudyMemo>> getMemos(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable Long summaryId) {
        return ResponseEntity.ok(learningDataService.getMemos(userId, summaryId));
    }

    private Long parseOptionalLong(String value) {
        if (value == null || value.isBlank()) {
            return 0L;
        }
        return Long.parseLong(value);
    }

    private boolean isGuestUser(String userId) {
        return userId == null || userId.isBlank() || userId.equals("guest");
    }
}
