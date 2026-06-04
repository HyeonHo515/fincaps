package com.community.community_chat.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PdfService {

    public record PdfExtractResult(
            String text,
            List<String> visualPages,
            String visualSummary) {
    }

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final String API_KEY_PLACEHOLDER_PREFIX = "open api key";
    private static final int MAX_VISUAL_PAGES = 20;

    @Value("${openai.api.key:}")
    private String apiKey;

    public String extractText(MultipartFile file) throws IOException {
    return extractTextWithVisuals(file).text();
}

public PdfExtractResult extractTextWithVisuals(MultipartFile file) throws IOException {
    validatePdf(file);

    try (InputStream inputStream = file.getInputStream();
            PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {

        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);

        String text = stripper.getText(document);
        PdfVisualStats visualStats = analyzeVisualElements(document);

        List<String> visualPages = extractEmbeddedImages(document);
        String visualSummary = analyzeVisualImages(visualPages);

        String processedText = preprocessTextOnly(text, visualStats);

        validateAllowedStudySubject(
                (processedText + "\n" + (visualSummary == null ? "" : visualSummary)).trim());

        return new PdfExtractResult(
                processedText,
                visualPages,
                visualSummary == null ? "" : visualSummary);
    }
}
private String analyzeVisualImages(List<String> visualImages) {
    if (!hasApiKey() || visualImages == null || visualImages.isEmpty()) {
        return "";
    }

    try {
        return requestVisualSummary(visualImages, visualImages.size());
    } catch (Exception e) {
        return "";
    }
}

private List<String> extractEmbeddedImages(PDDocument document) {
    List<String> images = new ArrayList<>();

    try {
        for (PDPage page : document.getPages()) {
            extractImagesFromResources(page.getResources(), images);
        }
    } catch (Exception e) {
        return List.of();
    }

    return images;
}

private void extractImagesFromResources(PDResources resources, List<String> images) throws IOException {
    if (resources == null) return;

    for (COSName name : resources.getXObjectNames()) {
        PDXObject xObject = resources.getXObject(name);

        if (xObject instanceof PDImageXObject imageObject) {
            BufferedImage image = imageObject.getImage();
            images.add(toJpegDataUrl(image));
        }

        if (xObject instanceof PDFormXObject formObject) {
            extractImagesFromResources(formObject.getResources(), images);
        }
    }
}

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드된 파일이 없습니다.");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("PDF 파일만 업로드할 수 있습니다.");
        }
    }

    private PdfVisualStats analyzeVisualElements(PDDocument document) throws IOException {
        int pageCount = document.getNumberOfPages();
        int imageCount = 0;
        int formCount = 0;

        for (PDPage page : document.getPages()) {
            VisualCount count = countVisualObjects(page.getResources());
            imageCount += count.imageCount();
            formCount += count.formCount();
        }

        return new PdfVisualStats(pageCount, imageCount, formCount);
    }

    private VisualCount countVisualObjects(PDResources resources) throws IOException {
        if (resources == null) {
            return new VisualCount(0, 0);
        }

        int imageCount = 0;
        int formCount = 0;

        for (COSName name : resources.getXObjectNames()) {
            PDXObject xObject = resources.getXObject(name);
            if (xObject instanceof PDImageXObject) {
                imageCount++;
            } else if (xObject instanceof PDFormXObject formObject) {
                formCount++;
                VisualCount nested = countVisualObjects(formObject.getResources());
                imageCount += nested.imageCount();
                formCount += nested.formCount();
            }
        }

        return new VisualCount(imageCount, formCount);
    }

    private String toJpegDataUrl(BufferedImage image) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", outputStream);
        String base64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());
        return "data:image/png;base64," + base64;
    }

    private String requestVisualSummary(List<String> pageImages, int totalPages) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        List<Map<String, Object>> content = new ArrayList<>();
        content.add(Map.of(
        "type", "text",
        "text",
        "아래 이미지들은 PDF 전체 페이지가 아니라, PDF 안에서 추출된 시각 자료입니다.\n"
                + "각 이미지를 시각 자료 1, 시각 자료 2처럼 구분해서 한국어로 요약해줘.\n"
                + "이미지 안에 있는 표, 그래프, 그림, 알고리즘 흐름도, 수식, 코드, 단계 설명을 중심으로 정리해줘.\n"
                + "PDF 본문 전체를 페이지별로 요약하지 말고, 반드시 첨부된 시각 자료 이미지 자체만 설명해줘.\n"
                + "빠른정렬, 퀵정렬, Quick Sort, 합병정렬, 이분검색, 분할정복 같은 알고리즘 이름이 이미지 안에 보이면 생략하지 말고 포함해줘.\n"
                + "출력 형식은 아래처럼 해줘.\n\n"
                + "### 시각 자료 1\n"
                + "- 주제:\n"
                + "- 이미지 내용:\n"
                + "- 학습 요약:\n\n"
                + "총 " + totalPages + "개의 시각 자료를 분석한다."));

        for (String imageUrl : pageImages) {
            content.add(Map.of(
                    "type", "image_url",
                    "image_url", Map.of(
                            "url", imageUrl,
                            "detail", "high")));
        }

        List<Map<String, Object>> messages = List.of(
                Map.of(
                        "role", "system",
                        "content",
                        "You are a Korean study assistant that extracts learning content from PDF page images."),
                Map.of(
                        "role", "user",
                        "content", content));

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("messages", messages);
        body.put("max_tokens", 1800);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            // Raw Type인 Map.class 대신 ParameterizedTypeReference를 사용해 Map<String, Object>
            // 구조로 확실히 바인딩합니다.
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    OPENAI_CHAT_COMPLETIONS_URL,
                    HttpMethod.POST,
                    request,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("choices")) {
                return "";
            }

            List<?> choices = (List<?>) responseBody.get("choices");
            if (choices == null || choices.isEmpty()) {
                return "";
            }

            Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
            Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
            if (message == null || message.get("content") == null) {
                return "";
            }
            return String.valueOf(message.get("content")).trim();
        } catch (Exception e) {
            System.err.println("OpenAI 비전 요약 API 호출 중 오류 발생: " + e.getMessage());
            return "";
        }
    }

    private String preprocessTextOnly(String text, PdfVisualStats visualStats) {
    String normalized = (text == null ? "" : text)
            .replace("\r", "")
            .replaceAll("[ \\t]+", " ")
            .replaceAll("\\n{2,}", "\n")
            .trim();

    if (normalized.isBlank()) {
        if (visualStats.imageCount() > 0 || visualStats.formCount() > 0) {
            return "";
        }
        throw new IllegalArgumentException("PDF에서 텍스트를 추출하지 못했습니다. 텍스트가 포함된 PDF인지 확인해주세요.");
    }

    return normalized;
}

    private boolean hasApiKey() {
        return apiKey != null
                && !apiKey.isBlank()
                && !apiKey.trim().toLowerCase().startsWith(API_KEY_PLACEHOLDER_PREFIX);
    }

    private void validateAllowedStudySubject(String text) {
        String subject = inferStudySubject(text);
        if ("자료구조".equals(subject) || "알고리즘".equals(subject) || "운영체제".equals(subject)) {
            return;
        }

        if ("네트워크".equals(subject) || "데이터베이스".equals(subject)) {
            throw new IllegalArgumentException(subject + " PDF는 현재 업로드할 수 없습니다. 자료구조, 알고리즘, 운영체제 PDF만 업로드해주세요.");
        }

        throw new IllegalArgumentException("컴퓨터공학과 허용 범위에 맞는 자료구조, 알고리즘, 운영체제 PDF만 업로드할 수 있습니다.");
    }

    private String inferStudySubject(String text) {
        String source = text == null ? "" : text;
        Map<String, Integer> scores = new HashMap<>();
        scores.put("알고리즘", 0);
        scores.put("자료구조", 0);
        scores.put("운영체제", 0);
        scores.put("네트워크", 0);
        scores.put("데이터베이스", 0);
        scores.put("학습자료", 0);

        addScore(scores, "알고리즘", source,
                "알고리즘|algorithm|시간\\s*복잡도|공간\\s*복잡도|빅오|big-?o|탐욕\\s*알고리즘|그리디|greedy|프림|prim|크루스칼|kruskal|최소\\s*비용\\s*신장\\s*트리|최소\\s*신장\\s*트리|MST|다익스트라|dijkstra|벨만|플로이드|최단\\s*경로|분할\\s*정복|동적\\s*계획|동적\\s*프로그래밍|DP|백트래킹|재귀\\s*알고리즘|정렬\\s*알고리즘|탐색\\s*알고리즘|이진\\s*탐색|선형\\s*탐색",
                7);
        addScore(scores, "자료구조", source,
                "자료구조|data\\s*structure|스택|큐|덱|연결\\s*리스트|해시\\s*테이블|해시|힙|우선순위\\s*큐|이진\\s*트리|탐색\\s*트리|BST|AVL|B-?트리|그래프\\s*자료구조|인접\\s*리스트|인접\\s*행렬",
                7);
        addScore(scores, "운영체제", source,
                "운영체제|operating\\s*system|OS|프로세스|스레드|CPU\\s*스케줄링|스케줄링|교착상태|메모리\\s*관리|페이징|세그먼테이션|가상\\s*메모리", 7);
        addScore(scores, "네트워크", source, "네트워크|TCP|UDP|DNS|HTTP|IP|패킷|프로토콜|라우팅|스위칭", 8);
        addScore(scores, "데이터베이스", source, "데이터베이스|DB|SQL|정규화|인덱스|트랜잭션|관계형|키\\s*제약", 8);
        addScore(scores, "학습자료", source,
                "한국\\s*문화|문화|역사|조선|고려|삼국|근대|현대|소설|문학|시대|사회|여성|어문\\s*생활|어문|규합총서|전통|민속|풍속|정치|경제|종교|불교|유교|가족|의식주|음식|한글|훈민정음|예술|음악|미술|문헌|고전|작품|저자",
                6);

        Map.Entry<String, Integer> blockedBest = List.of("네트워크", "데이터베이스", "학습자료").stream()
                .map(subject -> Map.entry(subject, scores.get(subject)))
                .max(Map.Entry.comparingByValue())
                .orElse(Map.entry("학습자료", 0));

        Map.Entry<String, Integer> allowedBest = List.of("자료구조", "알고리즘", "운영체제").stream()
                .map(subject -> Map.entry(subject, scores.get(subject)))
                .max(Map.Entry.comparingByValue())
                .orElse(Map.entry("학습자료", 0));

        if (blockedBest.getValue() >= allowedBest.getValue() && blockedBest.getValue() > 0) {
            return blockedBest.getKey();
        }

        return allowedBest.getValue() >= 6 ? allowedBest.getKey() : "학습자료";
    }

    private void addScore(Map<String, Integer> scores, String subject, String source, String regex, int weight) {
        int count = java.util.regex.Pattern.compile(regex, java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(source)
                .results()
                .mapToInt(match -> 1)
                .sum();
        scores.put(subject, scores.get(subject) + count * weight);
    }

    private record PdfVisualStats(int pageCount, int imageCount, int formCount) {
    }

    private record VisualCount(int imageCount, int formCount) {
    }
}
