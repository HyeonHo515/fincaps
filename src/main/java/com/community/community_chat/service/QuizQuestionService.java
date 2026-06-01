package com.community.community_chat.service;

import com.community.community_chat.entity.QuizQuestion;
import com.community.community_chat.repository.QuizQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class QuizQuestionService {

    private final QuizQuestionRepository quizQuestionRepository;

    public QuizQuestion saveQuestion(
            Long summaryId,
            String question,
            String answer,
            String questionType,
            String userId) {
        QuizQuestion quiz = new QuizQuestion();
        quiz.setSummaryId(summaryId);
        quiz.setQuestion(question);
        quiz.setAnswer(answer);
        quiz.setQuestionType(questionType);
        quiz.setUserId(userId);

        return quizQuestionRepository.save(quiz);
    }

    public List<QuizQuestion> getQuestions(Long summaryId) {

        return quizQuestionRepository
                .findBySummaryId(summaryId);
    }

    public List<QuizQuestion> getUserQuestions(String userId) {
        return quizQuestionRepository
                .findByUserId(userId);
    }
}
