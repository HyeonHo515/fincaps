package com.community.community_chat.controller;

import com.community.community_chat.dto.*;
import com.community.community_chat.service.CommunityService;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/posts")
    public List<PostResponse> getPosts() {
        return communityService.getPosts();
    }

    // 🛠️ 1. 게시글 등록 수정: @RequestBody -> @ModelAttribute 변경
    // consume 타입을 MULTIPART_FORM_DATA_VALUE로 명시해 주면 더 안전합니다.
    @PostMapping(value = "/posts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse createPost(@ModelAttribute PostRequest request) {
        return communityService.createPost(request);
    }

    // 🛠️ 2. 게시글 수정 수정: @RequestBody -> @ModelAttribute 변경
    @PutMapping(value = "/posts/{postId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse updatePost(
            @PathVariable Long postId,
            @RequestParam Long userId,
            @ModelAttribute PostUpdateRequest request) {
        return communityService.updatePost(postId, userId, request);
    }

    @DeleteMapping("/posts/{postId}")
    public String deletePost(
            @PathVariable Long postId,
            @RequestParam Long userId) {
        communityService.deletePost(postId, userId);
        return "게시글 삭제 완료";
    }

    @GetMapping("/posts/{postId}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long postId) {
        try {
            // 1. 서비스단을 통해 다운로드할 파일 정보를 가져옴
            File file = communityService.getDownloadFile(postId);

            if (file == null || !file.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            Resource resource = new UrlResource(file.toURI());

            // 2. 다운로드 시 한글 파일명이 깨지지 않도록 UTF-8 인코딩 처리
            String encodedFileName = URLEncoder.encode(file.getName(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20"); // 공백 처리

            // 3. 브라우저가 파일을 실행하지 않고 다운로드 창을 띄우도록 헤더 설정
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/comments")
    public CommentResponse createComment(@RequestBody CommentRequest request) {
        return communityService.createComment(request);
    }

    @PutMapping("/comments/{commentId}")
    public CommentResponse updateComment(
            @PathVariable Long commentId,
            @RequestParam Long userId,
            @RequestBody CommentUpdateRequest request) {
        return communityService.updateComment(commentId, userId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    public String deleteComment(
            @PathVariable Long commentId,
            @RequestParam Long userId) {
        communityService.deleteComment(commentId, userId);
        return "댓글 삭제 완료";
    }

    // ➕ 🛠️ 게시글 조회수 증가 API 엔드포인트 추가
    @PostMapping("/posts/{postId}/view")
    public ResponseEntity<Void> increaseViewCount(@PathVariable Long postId) {
        communityService.increaseViewCount(postId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/posts/{postId}/like")
    public PostResponse likePost(
            @PathVariable Long postId,
            @RequestParam Long userId) {
        return communityService.likePost(postId, userId);
    }

    @PostMapping("/posts/{postId}/report")
    public PostResponse reportPost(
            @PathVariable Long postId,
            @RequestParam Long userId,
            @RequestParam String reason) {
        return communityService.reportPost(postId, userId, reason);
    }

    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
    public String handleRuntimeException(RuntimeException e) {
        return e.getMessage();
    }
}