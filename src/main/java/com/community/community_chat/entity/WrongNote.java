package com.community.community_chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Entity
@Getter
@Setter
public class WrongNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String subject;
    private String title;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String q;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String wrong;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String correct;

    private String date;
    private String color;
    private String userId;
    private String questionType;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String optionsJson;

    private Integer answerIdx;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String answerKeywordsJson;

    private boolean debugSolved;
    private boolean relapsed;
    private Long cooldownUntil;
    private LocalDateTime createdAt = LocalDateTime.now();

    public void applyDefaults() {
        if (date == null || date.isBlank()) {
            date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd"));
        }
        if (color == null || color.isBlank()) {
            color = "var(--accent4)";
        }
        if (subject == null || subject.isBlank()) {
            subject = "AI";
        }
        if (title == null || title.isBlank()) {
            title = "Wrong note";
        }
        if (userId == null || userId.isBlank()) {
            userId = "guest";
        }
        if (questionType == null || questionType.isBlank()) {
            questionType = "essay";
        }
    }
}
