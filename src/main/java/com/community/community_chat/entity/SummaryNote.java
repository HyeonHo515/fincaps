package com.community.community_chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class SummaryNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long pdfId;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String summary;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String quizQuestion;

    private String quizAnswer;

    private int pageNumber;
    private String userId;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String visualPagesJson;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String visualSummary;

    private LocalDateTime cratedAt = LocalDateTime.now(); //오타인가?

    public Long getId() {
        return id;
    }
}
