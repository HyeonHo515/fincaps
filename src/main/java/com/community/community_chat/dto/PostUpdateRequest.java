package com.community.community_chat.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
public class PostUpdateRequest {
    private String title;
    private String content;
    private String category;
    private MultipartFile file;
}