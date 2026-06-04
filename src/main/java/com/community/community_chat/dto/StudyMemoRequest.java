package com.community.community_chat.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StudyMemoRequest {
    private Long id;
    private String summaryId; // PDF 요약본 ID (아직 없거나 기본값일 때는 "0")
    private String memoContent; // 사용자가 입력한 학습 메모 내용
}