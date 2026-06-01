package com.community.community_chat.repository;

import com.community.community_chat.entity.PostReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostReportRepository extends JpaRepository<PostReport, Long> {
    boolean existsByPostPostIdAndUserUserId(Long postId, Long userId);
}