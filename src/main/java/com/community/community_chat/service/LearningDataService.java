package com.community.community_chat.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.community.community_chat.entity.ReverseLearningLog;
import com.community.community_chat.entity.StudyMemo;
import com.community.community_chat.entity.SummaryNote;
import com.community.community_chat.repository.ReverseLearningLogRepository;
import com.community.community_chat.repository.StudyMemoRepository;
import com.community.community_chat.repository.SummaryNoteRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LearningDataService {

    private final SummaryNoteRepository summaryNoteRepository;
    private final ReverseLearningLogRepository reverseLearningLogRepository;
    private final StudyMemoRepository studyMemoRepository;

    public SummaryNote saveSummary(
        String userId,
        String summary,
        String visualPagesJson,
        String visualSummary) {

    SummaryNote note = new SummaryNote();
    note.setSummary(summary);
    note.setPageNumber(1);
    note.setUserId(normalizeUserId(userId));
    note.setVisualPagesJson(visualPagesJson == null ? "[]" : visualPagesJson);
    note.setVisualSummary(visualSummary == null ? "" : visualSummary);

    return summaryNoteRepository.save(note);
}

    public List<SummaryNote> getAllSummaries() {
        return summaryNoteRepository.findAll();
    }// 없애도되나?

    public SummaryNote getSummary(Long summaryId) {
        return summaryNoteRepository.findById(summaryId)
                .orElseThrow(() -> new IllegalArgumentException("요약 정보를 찾을 수 없습니다."));
    }// 없애도되나?

    public List<SummaryNote> getSummariesByUserId(String userId) {
        // Repository를 통해 userId가 일치하는 데이터만 가져옵니다.
        return summaryNoteRepository.findByUserId(userId);
    }

    public ReverseLearningLog saveReverseLearningLog(String userId, Long summaryId, String reverseQuestion,
            String userAnswer,
            String aiFeedback) {
        ReverseLearningLog log = new ReverseLearningLog();
        log.setSummaryId(summaryId);
        log.setReverseQuestion(reverseQuestion);
        log.setUserAnswer(userAnswer);
        log.setAiFeedback(aiFeedback);
        log.setUserId(normalizeUserId(userId));
        return reverseLearningLogRepository.save(log);
    }

    public List<ReverseLearningLog> getReverseLogs(Long summaryId) {
        return reverseLearningLogRepository.findBySummaryId(summaryId);
    }

    public List<ReverseLearningLog> getReverseLearningLogsByUserId(String userId) {
        // Repository에 findByUserId 가 구현되어 있어야 합니다. (최신순 조회를 원하면 OrderBy 컬럼명Desc 조합 권장)
        return reverseLearningLogRepository.findByUserId(normalizeUserId(userId));
    }

    public StudyMemo saveMemo(String userId, Long summaryId, String memoContent) {
        if (memoContent == null || memoContent.isBlank()) {
            throw new IllegalArgumentException("메모 내용을 입력해주세요.");
        }

        StudyMemo memo = new StudyMemo();
        memo.setSummaryId(summaryId == null ? 0L : summaryId);
        memo.setMemoContent(memoContent.trim());
        memo.setUserId(normalizeUserId(userId));
        return studyMemoRepository.save(memo);
    }

    public List<StudyMemo> getMemos(String userId, Long summaryId) {
        return studyMemoRepository.findByUserIdAndSummaryIdOrderByCreatedAtDesc(
                normalizeUserId(userId),
                summaryId == null ? 0L : summaryId);
    }

    @org.springframework.transaction.annotation.Transactional
    public StudyMemo updateMemo(String userId, Long memoId, String updatedContent) {
        // 1. 메모 존재 여부 확인 (studyMemoRepository 또는 프로젝트에 맞는 Repository 명칭 사용)
        StudyMemo memo = studyMemoRepository.findById(memoId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 메모입니다."));

        // 2. 작성자 본인 확인 검증
        // 💡 memo.getUserId()의 대소문자나 필드명이 프로젝트 엔티티와 일치하는지 확인하세요.
        if (!memo.getUserId().equals(userId)) {
            throw new SecurityException("본인이 작성한 메모만 수정할 수 있습니다.");
        }

        // 3. 내용 수정 (Dirty Checking으로 인해 트랜잭션 종료 시 자동 반영됨)
        memo.setMemoContent(updatedContent);

        return memo;
    }

    /**
     * 학습 메모 삭제
     */
    @org.springframework.transaction.annotation.Transactional
    public void deleteMemo(String userId, Long memoId) {
        // 1. 메모 존재 여부 확인
        StudyMemo memo = studyMemoRepository.findById(memoId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 메모입니다."));

        // 2. 작성자 본인 확인 검증
        if (!memo.getUserId().equals(userId)) {
            throw new SecurityException("본인이 작성한 메모만 삭제할 수 있습니다.");
        }

        // 3. DB에서 삭제
        studyMemoRepository.delete(memo);
    }

    private String normalizeUserId(String userId) {
        return userId == null || userId.isBlank() ? "guest" : userId.trim();
    }
}
