package com.community.community_chat.repository;

import com.community.community_chat.entity.ReverseLearningLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReverseLearningLogRepository extends JpaRepository<ReverseLearningLog, Long> {
    List<ReverseLearningLog> findBySummaryId(Long summaryId);

    List<ReverseLearningLog> findByUserId(String userId);
}
