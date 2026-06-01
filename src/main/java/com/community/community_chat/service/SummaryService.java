package com.community.community_chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SummaryService {

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final String API_KEY_PLACEHOLDER_PREFIX = "open api key";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api.key:}")
    private String apiKey;

    public String summarize(String text) {
        if (!hasApiKey()) {
            return localSummary(text);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content",
                "You are a study tutor. Summarize the provided material in Korean with structured bullet points. Use enough detail for students to make exam questions from the summary. Do not use markdown headings such as ###, bold marks such as **, or section title-only lines. If it is computer science material, keep technical terms and algorithm/data-structure distinctions accurate. If it is another subject, summarize that subject faithfully."));
        messages.add(Map.of(
                "role", "user",
                "content",
                "Summarize this study material in 6 to 8 Korean bullet points. Each line must start with '- ' and contain one complete sentence with the key concept, reason, and context when possible. Do not create numbered headings:\n"
                        + safeText(text)));

        try {
            return requestOpenAi(messages, 900);
        } catch (Exception e) {
            return localSummary(text);
        }
    }

    public Map<String, Object> generateBlankQuiz(String text) throws Exception {
        if (!hasApiKey()) {
            return localBlankQuiz(text);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content",
                "Create one Korean fill-in-the-blank quiz from the provided study material. Infer the actual subject from the material. Return JSON only: {\"question\":\"...\",\"answer\":\"...\"}."));
        messages.add(Map.of(
                "role", "user",
                "content", "Create a fill-in-the-blank quiz from this material:\n" + safeText(text)));

        try {
            String content = stripJsonFence(requestOpenAi(messages, 250));
            return objectMapper.readValue(content,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
                    });
        } catch (Exception e) {
            return localBlankQuiz(text);
        }
    }

    public String generateReverseQuestion(String summary, String question, String answer) {
        if (!hasApiKey()) {
            return "Explain the answer concept in your own words: " + safeText(answer);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content",
                "You are a study tutor. Create one short Korean question that checks conceptual understanding of the provided material."));
        messages.add(Map.of(
                "role", "user",
                "content",
                "Summary: " + safeText(summary) + "\n" +
                        "Question: " + safeText(question) + "\n" +
                        "Answer: " + safeText(answer) + "\n" +
                        "Create one deeper follow-up question in Korean."));

        try {
            return requestOpenAi(messages, 150);
        } catch (Exception e) {
            return "Explain the answer concept in your own words: " + safeText(answer);
        }
    }

    public String evaluateAnswer(String summary, String reverseQuestion, String userAnswer) {
        if (!hasApiKey()) {
            return localEvaluation(userAnswer);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content",
                "You are a study tutor. Evaluate the user's answer in Korean and give strengths plus improvements based on the provided material."));
        messages.add(Map.of(
                "role", "user",
                "content",
                "Summary: " + safeText(summary) + "\n" +
                        "AI question: " + safeText(reverseQuestion) + "\n" +
                        "User answer: " + safeText(userAnswer) + "\n\n" +
                        "Return Korean feedback with: 1. Evaluation 2. Strength 3. Improvement."));

        try {
            return requestOpenAi(messages, 400);
        } catch (Exception e) {
            return localEvaluation(userAnswer);
        }
    }

    private boolean hasApiKey() {
        return apiKey != null
                && !apiKey.isBlank()
                && !apiKey.trim().toLowerCase().startsWith(API_KEY_PLACEHOLDER_PREFIX);
    }

    private String requestOpenAi(List<Map<String, String>> messages, int maxTokens) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("messages", messages);
        body.put("max_tokens", maxTokens);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                OPENAI_CHAT_COMPLETIONS_URL,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null || !responseBody.containsKey("choices")) {
            throw new IllegalStateException("OpenAI response body is empty or invalid.");
        }

        List<?> choices = (List<?>) responseBody.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("OpenAI choices list is empty.");
        }

        Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
        Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
        if (message == null || message.get("content") == null) {
            throw new IllegalStateException("OpenAI response message content is empty.");
        }

        return String.valueOf(message.get("content"));
    }

    private String localSummary(String text) {
        String normalized = safeText(text).replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) {
            return "No content to summarize.";
        }

        String[] sentences = normalized.split("(?<=[.!?])\\s+");
        StringBuilder summary = new StringBuilder();
        int limit = Math.min(sentences.length, 7);
        for (int i = 0; i < limit; i++) {
            if (!sentences[i].isBlank()) {
                summary.append("- ").append(sentences[i].trim()).append("\n");
            }
        }

        return summary.toString().trim();
    }

    private Map<String, Object> localBlankQuiz(String text) {
        String[] keywords = {
                "process", "thread", "deadlock", "TCP", "UDP", "DNS", "memory", "scheduling",
                "프로세스", "스레드", "교착상태", "메모리", "스케줄링", "자료구조", "알고리즘"
        };
        String source = safeText(text).replaceAll("\\s+", " ").trim();

        for (String keyword : keywords) {
            if (source.toLowerCase().contains(keyword.toLowerCase())) {
                Map<String, Object> quiz = new LinkedHashMap<>();
                quiz.put("question", source.replaceFirst("(?i)" + keyword, "____"));
                quiz.put("answer", keyword);
                return quiz;
            }
        }

        Map<String, Object> quiz = new LinkedHashMap<>();
        String inferredKeyword = inferKeyword(source);
        quiz.put("question", source.isBlank()
                ? "이 학습 자료에서 가장 중요한 개념은 ____입니다."
                : source.replaceFirst(java.util.regex.Pattern.quote(inferredKeyword), "____"));
        quiz.put("answer", inferredKeyword);
        return quiz;
    }

    private String inferKeyword(String source) {
        if (source == null || source.isBlank()) {
            return "핵심 개념";
        }

        Map<String, Integer> counts = new LinkedHashMap<>();
        String[] words = source.replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}\\s]", " ").split("\\s+");
        for (String word : words) {
            String normalized = word.trim();
            if (normalized.length() < 2 || isStopword(normalized)) {
                continue;
            }
            counts.put(normalized, counts.getOrDefault(normalized, 0) + 1);
        }

        return counts.entrySet().stream()
                .sorted((a, b) -> {
                    int countCompare = Integer.compare(b.getValue(), a.getValue());
                    if (countCompare != 0) {
                        return countCompare;
                    }
                    return Integer.compare(b.getKey().length(), a.getKey().length());
                })
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse("핵심 개념");
    }

    private boolean isStopword(String word) {
        String lower = word.toLowerCase();
        return List.of(
                "그리고", "그러나", "따라서", "하지만", "또한", "대한", "위해", "있는", "한다", "된다",
                "this", "that", "with", "from", "into", "about", "when", "where", "which", "there").contains(lower);
    }

    private String localEvaluation(String userAnswer) {
        if (userAnswer == null || userAnswer.isBlank()) {
            return "평가: 보완 필요\n강점: 아직 답안이 없습니다.\n개선점: 핵심 개념을 먼저 한두 문장으로 정리해보세요.";
        }

        if (userAnswer.length() >= 30) {
            return "평가: 이해 양호\n강점: 개념을 자신의 말로 설명했습니다.\n개선점: 예시나 관련 개념과의 차이를 덧붙이면 더 좋습니다.";
        }

        return "평가: 보완 필요\n강점: 핵심 아이디어를 언급하기 시작했습니다.\n개선점: 정의, 특징, 사용 사례를 함께 포함해보세요.";
    }

    private String stripJsonFence(String content) {
        return safeText(content)
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }
}
