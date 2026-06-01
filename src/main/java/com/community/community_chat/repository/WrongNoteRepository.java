package com.community.community_chat.repository;

import com.community.community_chat.entity.WrongNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WrongNoteRepository extends JpaRepository<WrongNote, Long> {

    List<WrongNote> findAllByOrderByIdDesc();

    List<WrongNote> findByUserIdOrderByIdDesc(String userId);
}
