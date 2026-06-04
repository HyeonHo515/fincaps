package com.community.community_chat.repository;

import com.community.community_chat.entity.SummaryNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SummaryNoteRepository extends JpaRepository<SummaryNote, Long> {
    List<SummaryNote> findByUserId(String userId);
}
