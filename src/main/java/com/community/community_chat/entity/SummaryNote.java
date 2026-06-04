package com.community.community_chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class SummaryNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String summary;

    private int pageNumber;
    private String userId;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String visualPagesJson;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String visualSummary;

    private LocalDateTime cratedAt = LocalDateTime.now();
}
