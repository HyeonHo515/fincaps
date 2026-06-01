package com.community.community_chat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PostResponse {
    private Long id;
    private String title;
    private String content;
    private String category;
    private Long authorId;
    private String author;
    private String date;
    private int views;
    private int likes;
    private boolean hasFile;
    private String fileName;
    private List<CommentResponse> comments;
}