package com.community.community_chat.repository;

import com.community.community_chat.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByDeletedFalseOrderByCreatedAtDesc();
}