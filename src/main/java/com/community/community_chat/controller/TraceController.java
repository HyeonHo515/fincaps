package com.community.community_chat.controller;

import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TraceController {

    @org.springframework.beans.factory.annotation.Value("${judge0.api.key}")
    private String judge0ApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/compile")
    public ResponseEntity<String> runCompile(@RequestBody Map<String, Object> requestMap) {
        try {
            // 외부 Judge0 실제 API 주소
            String judge0Url = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-rapidapi-host", "judge0-ce.p.rapidapi.com");
            headers.set("x-rapidapi-key", judge0ApiKey); // 👈 properties에서 가져온 비밀키 주입!

            // 프론트엔드가 보낸 body 데이터(code, langId 등)를 그대로 전달
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestMap, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(judge0Url, entity, String.class);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());

        } catch (Exception e) {
            System.out.println("🚨 Judge0 컴파일 서버 통신 에러: " + e.getMessage());
            return ResponseEntity.badRequest().body("{\"status\":\"error\", \"message\":\"컴파일 서버 연결 실패\"}");
        }
    }

    @PostMapping("/trace")
    public ResponseEntity<String> traceCode(@RequestBody Map<String, String> payload) {
        String sourceCode = payload.get("source_code");
        String stdin = payload.getOrDefault("stdin", "");
        String langId = payload.getOrDefault("language_id", "71");

        if (sourceCode == null || sourceCode.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"status\":\"error\", \"message\":\"코드가 비어있습니다.\"}");
        }

        // 🛡️ 1차 안전장치: 악성 원격 코드 실행(RCE) 블랙리스트 차단
        if (!isSafeCode(sourceCode, langId)) {
            return ResponseEntity.badRequest()
                    .body("{\"status\":\"error\", \"message\":\"보안 정책에 의해 차단된 명령어가 포함되어 있습니다.\"}");
        }

        try {
            switch (langId) {
                case "71": // Python
                    return runLocalWorker("python", "tracer.py", sourceCode, stdin);

                case "63": // JavaScript
                    return runLocalWorker("node", "tracer.js", sourceCode, stdin);

                case "62": // Java
                case "50": // C
                case "54": // C++
                    return runPythonTutor(langId, sourceCode, stdin);

                default:
                    return ResponseEntity.badRequest().body("{\"status\":\"error\", \"message\":\"지원하지 않는 언어입니다.\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"status\":\"error\", \"message\":\"서버 내부 오류\"}");
        }
    }

    // 🛡️ 블랙리스트 키워드 필터링 시스템
    private boolean isSafeCode(String code, String langId) {
        String normalizedCode = code.toLowerCase().replaceAll("\\s+", "");

        if (langId.equals("71")) { // 파이썬 보안 위협 키워드
            String[] blocked = { "importos", "importsubprocess", "importsys", "open(", "eval(", "exec(" };
            for (String b : blocked) {
                if (normalizedCode.contains(b))
                    return false;
            }
        } else if (langId.equals("63")) { // 자바스크립트 보안 위협 키워드
            String[] blocked = { "require('fs')", "require('child_process')", "eval(", "process.", "require('http')" };
            for (String b : blocked) {
                if (normalizedCode.contains(b))
                    return false;
            }
        }
        return true;
    }

    // 🛠️ 로컬 일꾼 실행 엔진 (데드락 완벽 버퍼 차단 버전)
    private ResponseEntity<String> runLocalWorker(String command, String scriptName, String sourceCode, String stdin) {
        Path tempCodeFile = null;
        Path tempInputFile = null;
        Path tempOutputFile = null;

        try {
            String ext = command.equals("node") ? ".js" : ".py";
            tempCodeFile = Files.createTempFile("user_code_", ext);
            Files.writeString(tempCodeFile, sourceCode, StandardCharsets.UTF_8);

            tempInputFile = Files.createTempFile("user_input_", ".txt");
            Files.writeString(tempInputFile, stdin, StandardCharsets.UTF_8);

            // 대용량 JSON 데이터 수집 시 OS 파이프 버퍼 데드락을 방지하기 위한 파일 리다이렉션
            tempOutputFile = Files.createTempFile("user_output_", ".txt");

            ProcessBuilder pb;
            if (System.getProperty("os.name").toLowerCase().contains("win") && command.equals("node")) {
                pb = new ProcessBuilder("cmd", "/c", command, scriptName, tempCodeFile.toString(),
                        tempInputFile.toString());
            } else {
                pb = new ProcessBuilder(command, scriptName, tempCodeFile.toString(), tempInputFile.toString());
            }

            pb.environment().put("PYTHONIOENCODING", "UTF-8");
            pb.environment().put("LANG", "ko_KR.UTF-8");

            pb.redirectErrorStream(true);
            pb.redirectOutput(tempOutputFile.toFile()); // 출력을 스트림 버퍼가 아닌 파일로 직접 우회

            Process process = pb.start();

            // 🛡️ 2차 안전장치: 무한 루프 공격 대비 60초 시간 격리 제한
            boolean finished = process.waitFor(60, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return ResponseEntity.badRequest().body("{\"status\":\"error\", \"message\":\"실행 시간 초과\"}");
            }

            // 파일에서 결과를 읽어옵니다.
            String resultJson = Files.readString(tempOutputFile, StandardCharsets.UTF_8);

            // 🌟 핵심 해결책: 눈에 보이지 않는 쓰레기값을 제거하고 순수 JSON만 추출합니다!
            int startIndex = resultJson.indexOf("{");
            int endIndex = resultJson.lastIndexOf("}");

            if (startIndex != -1 && endIndex != -1) {
                // '{' 부터 '}' 까지만 정확하게 잘라냅니다.
                resultJson = resultJson.substring(startIndex, endIndex + 1);
            } else {
                return ResponseEntity.badRequest().body("{\"status\":\"error\", \"message\":\"JSON 데이터를 찾을 수 없습니다.\"}");
            }

            // 🌟 프론트엔드가 헷갈리지 않게 "이건 무조건 JSON이야!" 라고 도장을 찍어서 보냅니다.
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(resultJson);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"status\":\"error\"}");
        } finally {
            try {
                if (tempCodeFile != null)
                    Files.deleteIfExists(tempCodeFile);
            } catch (Exception ignored) {
            }
            try {
                if (tempInputFile != null)
                    Files.deleteIfExists(tempInputFile);
            } catch (Exception ignored) {
            }
            try {
                if (tempOutputFile != null)
                    Files.deleteIfExists(tempOutputFile);
            } catch (Exception ignored) {
            }
        }
    }

    private ResponseEntity<String> runPythonTutor(String langId, String sourceCode, String stdin) {
        try {
            // 1. 언어에 맞는 클라우드 엔드포인트 설정
            String endpoint = "/web_exec_java.py";
            if (langId.equals("50"))
                endpoint = "/web_exec_c.py";
            else if (langId.equals("54"))
                endpoint = "/web_exec_cpp.py";

            String optServerUrl = "https://pythontutor.com" + endpoint;

            // 2. 클라우드 서버가 요구하는 Form-UrlEncoded 양식으로 포장
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
            map.add("user_script", sourceCode);
            map.add("raw_input_json", stdin != null ? stdin : "");
            map.add("options_json", "{}");

            HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(map, headers);

            // 3. 전송 및 결과 반환
            ResponseEntity<String> response = restTemplate.postForEntity(optServerUrl, entity, String.class);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());

        } catch (Exception e) {
            System.out.println("🚨 클라우드 디버깅 서버 통신 에러: " + e.getMessage());
            return ResponseEntity.badRequest().body("{\"status\":\"error\", \"message\":\"클라우드 디버깅 서버 연결 실패\"}");
        }
    }
}