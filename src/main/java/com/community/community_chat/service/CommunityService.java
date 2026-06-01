package com.community.community_chat.service;

import com.community.community_chat.dto.*;
import com.community.community_chat.entity.*;
import com.community.community_chat.repository.*;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostReportRepository postReportRepository;

    private final String uploadDir = "C:/upload/community/";

    public List<PostResponse> getPosts() {
        return postRepository.findByDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(this::toPostResponse)
                .toList();
    }

    public PostResponse createPost(PostRequest request) {
        User user = userRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Post post = new Post();
        post.setUser(user);
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setCategory(request.getCategory());
        post.setCreatedAt(LocalDateTime.now());

        MultipartFile file = request.getFile();
        if (file != null && !file.isEmpty()) {
            String originalFileName = file.getOriginalFilename();
            post.setFileName(originalFileName);

            try {
                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File dest = new File(uploadDir + originalFileName);
                file.transferTo(dest);
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다.", e);
            }
        }

        Post saved = postRepository.save(post);
        return toPostResponse(saved);
    }

    public PostResponse updatePost(Long postId, Long userId, PostUpdateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        if (!post.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setCategory(request.getCategory());

        MultipartFile file = request.getFile();
        if (file != null && !file.isEmpty()) {
            String originalFileName = file.getOriginalFilename();
            post.setFileName(originalFileName);

            try {
                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File dest = new File(uploadDir + originalFileName);
                file.transferTo(dest);
            } catch (IOException e) {
                throw new RuntimeException("파일 수정 중 오류가 발생했습니다.", e);
            }
        }

        Post saved = postRepository.save(post);
        return toPostResponse(saved);
    }

    public void deletePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        if (!post.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }

        post.setDeleted(true);
        postRepository.save(post);
    }

    public CommentResponse createComment(CommentRequest request) {
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        User user = userRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setUser(user);
        comment.setContent(request.getContent());
        comment.setCreatedAt(LocalDateTime.now());

        commentRepository.save(comment);
        return toCommentResponse(comment);
    }

    public CommentResponse updateComment(Long commentId, Long userId, CommentUpdateRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }

        comment.setContent(request.getContent());
        commentRepository.save(comment);

        return toCommentResponse(comment);
    }

    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }

        comment.setDeleted(true);
        commentRepository.save(comment);
    }

    public PostResponse likePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        boolean alreadyLiked = postLikeRepository.existsByPostAndUser(post, user);
        if (alreadyLiked) {
            throw new RuntimeException("이미 추천한 게시글입니다.");
        }

        PostLike postLike = new PostLike();
        postLike.setPost(post);
        postLike.setUser(user);
        postLikeRepository.save(postLike);

        post.setLikeCount(post.getLikeCount() + 1);
        postRepository.save(post);

        return toPostResponse(post);
    }

    public PostResponse reportPost(Long postId, Long userId, String reason) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        PostReport report = new PostReport();
        report.setPost(post);
        report.setUser(user);
        report.setReason(reason);
        report.setCreatedAt(LocalDateTime.now());
        postReportRepository.save(report);

        post.setReportCount(post.getReportCount() + 1);
        postRepository.save(post);

        return toPostResponse(post);
    }

    private PostResponse toPostResponse(Post post) {
        List<CommentResponse> comments = commentRepository
                .findByPostPostIdAndDeletedFalseOrderByCreatedAtAsc(post.getPostId())
                .stream()
                .map(this::toCommentResponse)
                .toList();

        boolean hasFile = post.getFileName() != null && !post.getFileName().trim().isEmpty();

        return new PostResponse(
                post.getPostId(),
                post.getTitle(),
                post.getContent(),
                post.getCategory(),
                post.getUser().getUserId(),
                post.getUser().getName(),
                formatDate(post.getCreatedAt()),
                post.getViewCount(),
                post.getLikeCount(),
                hasFile,
                post.getFileName(),
                comments);
    }

    private CommentResponse toCommentResponse(Comment comment) {
        return new CommentResponse(
                comment.getCommentId(),
                comment.getUser().getUserId(),
                comment.getUser().getName(),
                comment.getContent(),
                formatDate(comment.getCreatedAt()),
                false);
    }

    private String formatDate(LocalDateTime dateTime) {
        if (dateTime == null)
            return "";
        return dateTime.format(DateTimeFormatter.ofPattern("yyyy. MM. dd."));
    }

    public File getDownloadFile(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        if (post.getFileName() == null || post.getFileName().isEmpty()) {
            throw new RuntimeException("이 게시글에는 첨부파일이 존재하지 않습니다.");
        }

        return new File(uploadDir + post.getFileName());
    }

    @org.springframework.transaction.annotation.Transactional
    public void increaseViewCount(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        post.setViewCount(post.getViewCount() + 1);
        postRepository.save(post);
    }
}