package com.community.community_chat.service;

import com.community.community_chat.dto.AiQuizRequest;
import com.community.community_chat.dto.AiQuizResponse;
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
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AiQuizService {

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final String API_KEY_PLACEHOLDER_PREFIX = "open api key";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api.key:}")
    private String apiKey;

    public AiQuizResponse generateQuiz(AiQuizRequest request) {
        AiQuizRequest normalizedRequest = normalizeRequest(request);

        if (!hasApiKey()) {
            AiQuizResponse fallback = fallbackQuiz(normalizedRequest);
            fallback.setSource("server-fallback");
            return fallback;
        }

        try {
            return requestAiQuiz(normalizedRequest);
        } catch (Exception e) {
            AiQuizResponse fallback = fallbackQuiz(normalizedRequest);
            fallback.setSource("server-fallback");
            return fallback;
        }
    }

    private AiQuizResponse requestAiQuiz(AiQuizRequest request) throws Exception {
        QuizVariation variation = randomVariation();
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content",
                "You create exam questions for Korean students from the provided study material. Return JSON only. " +
                        "Schema: {\"type\":\"mcq|essay\",\"difficulty\":\"easy|medium|hard\",\"question\":\"...\", \"options\":[\"...\",\"...\",\"...\",\"...\"], \"answerIdx\":0, \"answer\":\"...\", \"explanation\":\"...\", \"keyword\":\"...\"}. "
                        +
                        "Write question, options, answer, explanation, and keyword in Korean. For essay questions, return an empty options array and answerIdx -1. "
                        +
                        "The answer field is mandatory. For mcq, answer must exactly match the correct option text. For essay, answer must be a concrete model answer based on the study material, not an instruction like 'refer to the summary'. "
                        +
                        "The explanation field must explain the answer using evidence from the provided material. " +
                        "Only create questions for 자료구조, 알고리즘, or 운영체제. Stay inside the requested subject and do not switch to network, database, or non-CS material. "
                        +
                        "Create a fresh question every time. " +
                        "Do not reuse the same wording, same example, same answer pattern, or same distractors."));
        messages.add(Map.of(
                "role", "user",
                "content",
                "Subject: " + request.getSubject() + "\n" +
                        "Difficulty: " + request.getDifficulty() + "\n" +
                        "Question type: " + request.getType() + "\n" +
                        "Question style: " + variation.style() + "\n" +
                        "Concept focus: " + variation.focus() + "\n" +
                        "For multiple choice, put the correct answer at option index: " + variation.answerIndex() + "\n"
                        +
                        "Study material and recent-question hints:\n" + request.getSourceText() + "\n\n" +
                        "Requirements:\n" +
                        "- Base the question on the provided summary/material, not on a fixed computer science template.\n"
                        +
                        "- Do not tell the student to look back at the summary. Write the actual correct answer in the answer field.\n"
                        +
                        "- If numbered summary items are provided and the user requested specific numbers, use those numbered items as the primary source.\n"
                        +
                        "- Use a different concept or angle from any recent question hints.\n" +
                        "- Make distractors plausible, not obviously wrong.\n" +
                        "- The explanation must teach why the answer is right and why the tempting wrong option is wrong.\n"
                        +
                        "- Keep the output JSON valid."));

        String content = stripJsonFence(requestOpenAi(messages, 800));
        AiQuizResponse response = objectMapper.readValue(content, AiQuizResponse.class);
        AiQuizResponse normalized = normalizeResponse(response, request);
        normalized.setSource("openai");
        return normalized;
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
        body.put("temperature", 0.95);
        body.put("top_p", 0.9);
        body.put("presence_penalty", 0.5);
        body.put("frequency_penalty", 0.35);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                OPENAI_CHAT_COMPLETIONS_URL,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null || !responseBody.containsKey("choices")) {
            throw new IllegalStateException("OpenAI response body is empty.");
        }

        List<?> choices = (List<?>) responseBody.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("OpenAI choices list is empty.");
        }

        Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
        Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");

        if (message == null || message.get("content") == null) {
            throw new IllegalStateException("OpenAI response message content is null.");
        }

        return String.valueOf(message.get("content"));
    }

    private AiQuizRequest normalizeRequest(AiQuizRequest request) {
        AiQuizRequest normalized = request == null ? new AiQuizRequest() : request;
        normalized.setSubject(normalizeSubject(defaultValue(normalized.getSubject(), "운영체제")));
        normalized.setDifficulty(normalizeDifficulty(normalized.getDifficulty()));
        normalized.setType(normalizeType(normalized.getType()));
        normalized.setSourceText(defaultValue(normalized.getSourceText(), "업로드한 학습 자료의 핵심 개념"));
        return normalized;
    }

    private AiQuizResponse normalizeResponse(AiQuizResponse response, AiQuizRequest request) {
        AiQuizResponse normalized = response == null ? fallbackQuiz(request) : response;
        normalized.setType(normalizeType(normalized.getType()));
        normalized.setDifficulty(normalizeDifficulty(normalized.getDifficulty()));
        normalized.setQuestion(defaultValue(normalized.getQuestion(), fallbackQuiz(request).getQuestion()));
        normalized.setExplanation(defaultValue(normalized.getExplanation(), "핵심 개념을 다시 복습해보세요."));
        normalized.setKeyword(defaultValue(normalized.getKeyword(), request.getSubject()));
        normalized.setSource(defaultValue(normalized.getSource(), "openai"));

        if ("mcq".equals(normalized.getType())) {
            if (normalized.getOptions() == null || normalized.getOptions().size() < 4) {
                normalized.setOptions(fallbackQuiz(request).getOptions());
            }
            int resolvedAnswerIdx = resolveAnswerIndex(normalized.getAnswerIdx(), normalized.getAnswer(),
                    normalized.getOptions());
            normalized.setAnswerIdx(resolvedAnswerIdx);
            normalized.setAnswer(normalized.getOptions().get(resolvedAnswerIdx));
        } else {
            normalized.setOptions(new ArrayList<>());
            normalized.setAnswerIdx(-1);
            normalized.setAnswer(defaultValue(normalized.getAnswer(), buildMaterialBasedEssayAnswer(request)));
        }

        return normalized;
    }

    private int resolveAnswerIndex(Integer answerIdx, String answer, List<String> options) {
        if (options == null || options.isEmpty()) {
            return 0;
        }

        String normalizedAnswer = normalizeAnswerText(answer);
        if (!normalizedAnswer.isBlank()) {
            for (int i = 0; i < options.size(); i++) {
                if (normalizeAnswerText(options.get(i)).equals(normalizedAnswer)) {
                    return i;
                }
            }
            for (int i = 0; i < options.size(); i++) {
                String normalizedOption = normalizeAnswerText(options.get(i));
                if (!normalizedOption.isBlank()
                        && (normalizedOption.contains(normalizedAnswer)
                                || normalizedAnswer.contains(normalizedOption))) {
                    return i;
                }
            }
            if (normalizedAnswer.matches("^[1-4].*")) {
                int oneBasedIndex = Character.getNumericValue(normalizedAnswer.charAt(0)) - 1;
                if (oneBasedIndex >= 0 && oneBasedIndex < options.size()) {
                    return oneBasedIndex;
                }
            }
        }

        if (answerIdx != null) {
            if (answerIdx >= 0 && answerIdx < options.size()) {
                return answerIdx;
            }
            if (answerIdx >= 1 && answerIdx <= options.size()) {
                return answerIdx - 1;
            }
        }

        return 0;
    }

    private String normalizeAnswerText(String value) {
        return defaultValue(value, "")
                .replaceFirst("(?i)^정답\\s*[:：-]?\\s*", "")
                .replaceFirst("^\\d+\\s*(번|[.)])\\s*", "")
                .replaceAll("\\s+", "")
                .replaceAll("[.,!?\"'“”‘’(){}\\[\\]<>:：;；]", "")
                .trim();
    }

    private String buildMaterialBasedEssayAnswer(AiQuizRequest request) {
        List<String> materialSentences = extractMaterialSentences(request.getSourceText());
        if (materialSentences.isEmpty()) {
            return "제공된 학습 자료의 핵심 개념, 근거, 예시를 연결해 서술해야 합니다.";
        }
        return String.join(" ", materialSentences.subList(0, Math.min(2, materialSentences.size())));
    }

    private List<String> extractMaterialSentences(String sourceText) {
        String source = defaultValue(sourceText, "")
                .replaceAll("(?m)^(AI 요약|번호가 붙은 요약 항목|사용자가 선택한 요약 번호|원문 일부|학습 자료|선택 과목|사용자 요청|최근 문제):?\\s*", "")
                .replaceAll("(?m)^\\d+번\\.\\s*", "");
        String[] rawSentences = source.split("[\\n.!?]+\\s*");
        List<String> sentences = new ArrayList<>();
        for (String sentence : rawSentences) {
            String value = sentence.replaceAll("\\s+", " ").trim();
            if (value.length() < 12)
                continue;
            if (value.contains("질문 수 설정") || value.contains("최근 생성한 문제") || value.contains("Requirements"))
                continue;
            if (!value.endsWith("다") && !value.endsWith("요")) {
                value = value + "입니다";
            }
            sentences.add(value + ".");
            if (sentences.size() >= 6)
                break;
        }
        return sentences;
    }

    private AiQuizResponse fallbackQuiz(AiQuizRequest request) {
        List<AiQuizResponse> pool = "essay".equals(normalizeType(request.getType()))
                ? essayFallbackPool(request)
                : mcqFallbackPool(request);
        String subject = normalizeSubject(request.getSubject());
        List<AiQuizResponse> filtered = new ArrayList<>();
        for (AiQuizResponse quiz : pool) {
            if (subject.equals(normalizeSubject(quiz.getKeyword()))) {
                filtered.add(quiz);
            }
        }
        List<AiQuizResponse> candidates = filtered.isEmpty() ? pool : filtered;
        return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    private List<AiQuizResponse> mcqFallbackPool(AiQuizRequest request) {
        String difficulty = normalizeDifficulty(request.getDifficulty());
        List<AiQuizResponse> pool = new ArrayList<>();

        AiQuizResponse os = baseFallback(request, "mcq", difficulty, "운영체제");
        os.setQuestion("스레드가 프로세스보다 가볍다고 말하는 이유로 옳은 것은 무엇인가요?");
        os.setOptions(List.of(
                "같은 프로세스 안의 Code, Data, Heap 영역을 공유하기 때문이다.",
                "스레드는 항상 다른 컴퓨터에서 실행되기 때문이다.",
                "스레드는 CPU 시간을 사용할 수 없기 때문이다.",
                "스레드는 모든 자원을 별도 주소 공간에 저장하기 때문이다."));
        os.setAnswerIdx(0);
        os.setAnswer(os.getOptions().get(0));
        os.setExplanation("스레드는 같은 프로세스의 Code, Data, Heap 영역을 공유하므로 생성과 문맥 교환 비용이 프로세스보다 작습니다.");
        pool.add(os);

        AiQuizResponse ds = baseFallback(request, "mcq", difficulty, "자료구조");
        ds.setQuestion("스택이 큐보다 더 적합한 상황은 무엇인가요?");
        ds.setOptions(List.of(
                "가장 최근에 추가한 항목을 먼저 처리해야 할 때",
                "가장 오래 기다린 요청을 먼저 처리해야 할 때",
                "모든 항목을 자동으로 정렬해야 할 때",
                "인덱스로 임의 접근하는 것이 핵심일 때"));
        ds.setAnswerIdx(0);
        ds.setAnswer(ds.getOptions().get(0));
        ds.setExplanation("스택은 LIFO 구조라서 가장 최근에 들어온 항목을 먼저 처리하는 함수 호출, 되돌리기 기능에 적합합니다.");
        pool.add(ds);

        AiQuizResponse algorithm = baseFallback(request, "mcq", difficulty, "알고리즘");
        algorithm.setQuestion("이진 탐색의 시간 복잡도가 O(log n)인 이유는 무엇인가요?");
        algorithm.setOptions(List.of(
                "탐색 범위를 매 단계 절반씩 줄이기 때문이다.",
                "모든 원소를 항상 한 번씩 확인하기 때문이다.",
                "입력 크기와 상관없이 한 번만 실행되기 때문이다.",
                "정렬 과정이 필요 없기 때문이다."));
        algorithm.setAnswerIdx(0);
        algorithm.setAnswer(algorithm.getOptions().get(0));
        algorithm.setExplanation("이진 탐색은 중앙값 비교 후 한쪽 절반을 제외하므로 단계 수가 로그 형태로 증가합니다.");
        pool.add(algorithm);

        return pool;
    }

    private List<AiQuizResponse> essayFallbackPool(AiQuizRequest request) {
        String difficulty = normalizeDifficulty(request.getDifficulty());
        List<AiQuizResponse> pool = new ArrayList<>();

        AiQuizResponse process = baseFallback(request, "essay", difficulty, "운영체제");
        process.setQuestion("프로세스와 스레드의 차이를 메모리 공유 관점에서 설명하세요.");
        process.setAnswer("프로세스는 독립된 메모리 공간을 가지고, 스레드는 같은 프로세스 안의 Code, Data, Heap 영역을 공유하며 Stack은 독립적으로 가집니다.");
        process.setExplanation("좋은 답안은 프로세스의 독립성과 스레드의 공유 범위를 함께 설명해야 합니다.");
        pool.add(process);

        AiQuizResponse complexity = baseFallback(request, "essay", difficulty, "알고리즘");
        complexity.setQuestion("이진 탐색을 예로 들어 O(log n)이 O(n)보다 입력 증가에 더 유리한 이유를 설명하세요.");
        complexity.setAnswer("O(log n)은 매 단계 탐색 범위를 일정 비율로 줄이고, O(n)은 원소를 하나씩 확인할 수 있습니다. 이진 탐색은 범위를 반복해서 절반으로 줄입니다.");
        complexity.setExplanation("좋은 답안은 증가율 차이와 이진 탐색의 반복적인 절반 감소를 연결해야 합니다.");
        pool.add(complexity);

        AiQuizResponse deadlock = baseFallback(request, "essay", difficulty, "운영체제");
        deadlock.setQuestion("교착상태가 발생하기 위한 네 가지 조건과 예방 방법을 설명하세요.");
        deadlock.setAnswer("교착상태는 상호 배제, 점유 대기, 비선점, 순환 대기가 모두 만족될 때 발생하며, 이 중 하나라도 깨면 예방할 수 있습니다.");
        deadlock.setExplanation("좋은 답안은 네 조건의 이름과 조건 제거가 예방으로 이어지는 이유를 포함해야 합니다.");
        pool.add(deadlock);

        AiQuizResponse hash = baseFallback(request, "essay", difficulty, "자료구조");
        hash.setQuestion("해시 테이블에서 충돌이 발생하는 이유와 대표적인 해결 방법을 설명하세요.");
        hash.setAnswer("서로 다른 키가 같은 해시 값이나 버킷에 매핑될 때 충돌이 발생하며, 체이닝이나 개방 주소법으로 해결할 수 있습니다.");
        hash.setExplanation("좋은 답안은 충돌 원인과 체이닝, 선형 조사 같은 해결 방법을 포함해야 합니다.");
        pool.add(hash);

        return pool;
    }

    private AiQuizResponse baseFallback(AiQuizRequest request, String type, String difficulty, String keyword) {
        AiQuizResponse response = new AiQuizResponse();
        response.setType(type);
        response.setDifficulty(difficulty);
        response.setKeyword(normalizeSubject(keyword));
        if ("essay".equals(type)) {
            response.setOptions(new ArrayList<>());
            response.setAnswerIdx(-1);
        }
        return response;
    }

    private QuizVariation randomVariation() {
        List<String> styles = List.of(
                "definition trap",
                "compare two similar concepts",
                "real-world scenario",
                "choose the false statement",
                "trace a short example",
                "cause-and-effect reasoning",
                "debug a misconception",
                "apply the concept to a new situation");
        List<String> focuses = List.of(
                "core definition",
                "common misconception",
                "time or space complexity",
                "trade-off",
                "edge case",
                "practical usage",
                "difference from a related concept",
                "why the concept matters");
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return new QuizVariation(
                styles.get(random.nextInt(styles.size())),
                focuses.get(random.nextInt(focuses.size())),
                random.nextInt(4));
    }

    private record QuizVariation(String style, String focus, int answerIndex) {
    }

    private boolean hasApiKey() {
        return apiKey != null
                && !apiKey.isBlank()
                && !apiKey.trim().toLowerCase().startsWith(API_KEY_PLACEHOLDER_PREFIX);
    }

    private String normalizeDifficulty(String difficulty) {
        String value = defaultValue(difficulty, "medium");
        if ("easy".equalsIgnoreCase(value) || "medium".equalsIgnoreCase(value) || "hard".equalsIgnoreCase(value)) {
            return value.toLowerCase();
        }
        if ("high".equalsIgnoreCase(value)) {
            return "hard";
        }
        if ("low".equalsIgnoreCase(value)) {
            return "easy";
        }
        return "medium";
    }

    private String normalizeType(String type) {
        String value = defaultValue(type, "mcq");
        if ("essay".equalsIgnoreCase(value)) {
            return "essay";
        }
        return "mcq";
    }

    private String normalizeSubject(String subject) {
        String value = defaultValue(subject, "운영체제");
        if (value.contains("자료"))
            return "자료구조";
        if (value.contains("알고"))
            return "알고리즘";
        if (value.contains("운영") || value.equalsIgnoreCase("os") || value.toLowerCase().contains("operating"))
            return "운영체제";
        return "운영체제";
    }

    private String stripJsonFence(String content) {
        return defaultValue(content, "")
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }

    private String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
