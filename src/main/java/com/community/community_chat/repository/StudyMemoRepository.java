package com.community.community_chat.repository;

import com.community.community_chat.entity.StudyMemo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudyMemoRepository extends JpaRepository<StudyMemo, Long> {
    List<StudyMemo> findBySummaryId(Long summaryId);

    List<StudyMemo> findByUserIdAndSummaryIdOrderByCreatedAtDesc(String userId, Long summaryId);
}
