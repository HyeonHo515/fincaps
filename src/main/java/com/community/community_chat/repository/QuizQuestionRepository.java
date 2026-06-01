package com.community.community_chat.repository;

import com.community.community_chat.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    List<QuizQuestion> findBySummaryId(Long summaryId);

    List<QuizQuestion> findByUserId(String userId);
}
