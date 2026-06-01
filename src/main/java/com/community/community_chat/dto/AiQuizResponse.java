package com.community.community_chat.dto;

import java.util.ArrayList;
import java.util.List;

public class AiQuizResponse {

    private String type;
    private String difficulty;
    private String question;
    private List<String> options = new ArrayList<>();
    private Integer answerIdx;
    private String answer;
    private String explanation;
    private String keyword;
    private String source;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public List<String> getOptions() {
        return options;
    }

    public void setOptions(List<String> options) {
        this.options = options == null ? new ArrayList<>() : options;
    }

    public Integer getAnswerIdx() {
        return answerIdx;
    }

    public void setAnswerIdx(Integer answerIdx) {
        this.answerIdx = answerIdx;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
