package com.community.community_chat.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.community.community_chat.dto.StudyMemoRequest;
import com.community.community_chat.entity.QuizQuestion;
import com.community.community_chat.entity.ReverseLearningLog;
import com.community.community_chat.entity.StudyMemo;
import com.community.community_chat.entity.SummaryNote;
import com.community.community_chat.service.LearningDataService;
import com.community.community_chat.service.PdfService;
import com.community.community_chat.service.QuizQuestionService;
import com.community.community_chat.service.SummaryService;

import lombok.RequiredArgsConstructor;

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
    PdfService.PdfExtractResult result;

    try {
        result = pdfService.extractTextWithVisuals(file);
    } catch (IllegalArgumentException e) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("fileName", file.getOriginalFilename());
    response.put("textLength", result.text().length());
    response.put("text", result.text());
    response.put("visualPages", result.visualPages());
    response.put("visualSummary", result.visualSummary());

    return ResponseEntity.ok(response);
}

    @PostMapping("/summary")
    public ResponseEntity<Map<String, Object>> summarize(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, String> request) throws Exception {

        String text = request.get("text");
        if (text == null || text.isBlank()) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "텍스트 내용이 없습니다.");
            return ResponseEntity.badRequest().body(error);
        }

        // 1. AI 요약 생성
        String summary = summaryService.summarize(text);

        // 2. 빈칸 퀴즈 생성
        Map<String, Object> quiz = summaryService.generateBlankQuiz(summary);
        String question = (String) quiz.get("question");
        String answer = (String) quiz.get("answer");

        // 🛑 [수정] DB 저장 로직(saveSummary)을 삭제합니다.
        // 요약 Id는 아직 저장되지 않았으므로 0으로 리턴합니다.
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summaryId", 0);
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
public ResponseEntity<SummaryNote> saveSummary(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestBody Map<String, String> request) {

    String summary = request.get("summary");
    String visualPagesJson = request.getOrDefault("visualPagesJson", "[]");
    String visualSummary = request.getOrDefault("visualSummary", "");

    if (userId == null || userId.isBlank()) {
        userId = "guest";
    }

    SummaryNote note = learningDataService.saveSummary(
            userId,
            summary,
            visualPagesJson,
            visualSummary);

    return ResponseEntity.ok(note);
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
                userId,
                parseOptionalLong(request.get("summaryId")),
                request.get("reverseQuestion"),
                request.get("userAnswer"),
                request.get("aiFeedback"));

        return ResponseEntity.ok(log);
    }

    @GetMapping("/reverse-log")
    public ResponseEntity<List<ReverseLearningLog>> getMyReverseLogs(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        if (isGuestUser(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 해당 로그인 유저의 아이디로 저장된 전체 피드백 내역 리스트 조회
        // 💡 learningDataService 내에 이 메서드를 추가하고 Repository에서 findByUserId 등으로 쿼리하게 연동해
        // 줍니다.
        List<ReverseLearningLog> logs = learningDataService.getReverseLearningLogsByUserId(userId);

        return ResponseEntity.ok(logs);
    }

    @PostMapping("/memo")
    public ResponseEntity<StudyMemo> saveMemo(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody StudyMemoRequest requestDto) { // 💡 Map 대신 DTO 객체로 직접 수신

        if (isGuestUser(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 💡 서비스 메서드 호출 시 subject(과목)도 함께 넘겨줍니다.
        StudyMemo memo = learningDataService.saveMemo(
                userId,
                parseOptionalLong(requestDto.getSummaryId()),
                requestDto.getMemoContent());

        return ResponseEntity.ok(memo);
    }

    @GetMapping("/memo/{summaryId}")
    public ResponseEntity<List<StudyMemo>> getMemos(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable Long summaryId) {
        return ResponseEntity.ok(learningDataService.getMemos(userId, summaryId));
    }

    @PostMapping("/memo/update")
    public ResponseEntity<?> updateMemo(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody StudyMemoRequest requestDto) {

        if (isGuestUser(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            // 서비스 레이어의 updateMemo 메서드 호출
            StudyMemo updatedMemo = learningDataService.updateMemo(
                    userId,
                    requestDto.getId(),
                    requestDto.getMemoContent());
            return ResponseEntity.ok(updatedMemo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @PostMapping("/memo/delete")
    public ResponseEntity<?> deleteMemo(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody StudyMemoRequest requestDto) {

        if (isGuestUser(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            // 서비스 레이어의 deleteMemo 메서드 호출
            learningDataService.deleteMemo(userId, requestDto.getId());
            return ResponseEntity.ok().body("{\"message\":\"success\"}");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    private Long parseOptionalLong(String value) {
        if (value == null || value.isBlank() || value.equals("0")) { // 💡 "0"도 안전하게 0L로 처리하도록 보완
            return 0L;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private boolean isGuestUser(String userId) {
        return userId == null || userId.isBlank() || userId.equals("guest");
    }
}
