package com.community.community_chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class ReverseLearningLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long summaryId;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String reverseQuestion;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String userAnswer;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String aiFeedback;

    private String userId;
    private LocalDateTime createdAt = LocalDateTime.now();
}
