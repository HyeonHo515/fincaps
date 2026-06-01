package com.community.community_chat.service;

import com.community.community_chat.dto.AiChatRequest;
import com.community.community_chat.dto.AiChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiChatService {

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final String API_KEY_PLACEHOLDER_PREFIX = "open api key";

    @Value("${openai.api.key:}")
    private String apiKey;

    public AiChatResponse answer(AiChatRequest request) {
        String message = request == null ? "" : safeText(request.getMessage()).trim();
        String context = request == null ? "" : safeText(request.getContext()).trim();

        if (message.isBlank()) {
            return new AiChatResponse("질문을 입력해주세요.");
        }

        if (!hasApiKey()) {
            return new AiChatResponse(localAnswer(message));
        }

        try {
            return new AiChatResponse(requestOpenAi(message, context));
        } catch (Exception e) {
            return new AiChatResponse(localAnswer(message));
        }
    }

    private String requestOpenAi(String message, String context) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("temperature", 0.5);
        body.put("max_tokens", 700);
        body.put("messages", List.of(
                Map.of(
                        "role", "system",
                        "content",
                        "You are a Korean computer science tutor for college students. Explain clearly, use examples when useful, and keep the answer concise."),
                Map.of(
                        "role", "user",
                        "content", buildUserPrompt(message, context))));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                OPENAI_CHAT_COMPLETIONS_URL,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null || !responseBody.containsKey("choices")) {
            throw new IllegalStateException("OpenAI 응답 바디가 비어있거나 choices가 없습니다.");
        }

        // 제네릭 타입을 안전하게 캐스팅
        List<?> choices = (List<?>) responseBody.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("choices 리스트가 비어있습니다.");
        }

        Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
        Map<?, ?> responseMessage = (Map<?, ?>) firstChoice.get("message");

        if (responseMessage == null || responseMessage.get("content") == null) {
            throw new IllegalStateException("응답 메시지에서 content를 찾을 수 없습니다.");
        }

        return String.valueOf(responseMessage.get("content"));
    }

    private String buildUserPrompt(String message, String context) {
        if (context.isBlank()) {
            return message;
        }
        return "Study context:\n" + context + "\n\nQuestion:\n" + message;
    }

    private String localAnswer(String message) {
        if (containsAny(message, "재귀", "recursion")) {
            return "재귀는 함수가 자기 자신을 다시 호출해서 큰 문제를 작은 문제로 나누는 방식입니다.\n\n핵심은 두 가지입니다.\n1. 기저 조건: 언제 멈출지 정하는 조건\n2. 재귀 호출: 더 작은 입력으로 자기 자신을 호출하는 부분\n\n기저 조건이 없으면 무한 호출이 발생할 수 있습니다.";
        }
        if (containsAny(message, "스택", "stack")) {
            return "스택은 LIFO 구조입니다. Last In, First Out이라서 마지막에 들어온 데이터가 가장 먼저 나갑니다.\n\n대표 연산은 push, pop, peek이고 함수 호출 관리, 괄호 검사, DFS 등에 자주 쓰입니다.";
        }
        if (containsAny(message, "큐", "queue")) {
            return "큐는 FIFO 구조입니다. First In, First Out이라서 먼저 들어온 데이터가 먼저 나갑니다.\n\nBFS, 작업 대기열, 프로세스 스케줄링 같은 곳에서 많이 사용됩니다.";
        }
        if (containsAny(message, "TCP", "UDP")) {
            return "TCP는 신뢰성을 중시하고, UDP는 속도를 중시합니다.\n\nTCP는 연결을 만들고 순서 보장, 재전송, 오류 제어를 제공합니다. UDP는 연결 과정이 단순해서 빠르지만 순서나 재전송을 보장하지 않습니다.";
        }
        if (containsAny(message, "운영체제", "프로세스", "스레드")) {
            return "프로세스는 실행 중인 프로그램이고 독립된 메모리 공간을 가집니다. 스레드는 프로세스 안에서 실행되는 흐름이며 같은 프로세스의 자원을 공유합니다.\n\n그래서 스레드는 가볍지만, 공유 자원 문제를 조심해야 합니다.";
        }
        if (containsAny(message, "빅오", "big-o", "시간복잡도")) {
            return "빅오 표기법은 입력 크기가 커질 때 알고리즘의 실행 시간이나 메모리 사용량이 얼마나 빠르게 증가하는지 표현하는 방법입니다.\n\n예: O(1), O(log n), O(n), O(n log n), O(n²)";
        }
        return "좋은 질문이에요. 현재는 API 키가 placeholder라서 임시 답변으로 동작하고 있습니다.\n\nOpenAI API 키를 넣으면 이 질문에 맞춰 AI가 직접 설명을 생성합니다.";
    }

    private boolean containsAny(String text, String... keywords) {
        String lower = safeText(text).toLowerCase();
        for (String keyword : keywords) {
            if (lower.contains(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private boolean hasApiKey() {
        return apiKey != null
                && !apiKey.isBlank()
                && !apiKey.trim().toLowerCase().startsWith(API_KEY_PLACEHOLDER_PREFIX);
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }
}
