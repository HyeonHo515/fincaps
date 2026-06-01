package com.community.community_chat.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommentRequest {
    private Long postId;
    private Long authorId;
    private String content;
}