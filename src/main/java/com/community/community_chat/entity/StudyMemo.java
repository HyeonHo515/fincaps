package com.community.community_chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class StudyMemo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long summaryId;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String memoContent;

    private String userId;
    private LocalDateTime createdAt = LocalDateTime.now();
}
