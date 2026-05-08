# WithLab Ops — 프로젝트 셋업 패키지

> 과일 발주 관리 시스템. 쿠팡/토스 주문 엑셀 → 공급처별 발주서 자동 생성 → 운송장 매칭.

## 이 패키지가 포함하는 것

이 zip은 **Claude Code로 단계별 개발을 시작할 수 있는 스펙 + 컨텍스트 문서 모음**입니다.
실제 코드는 들어있지 않습니다. Claude Code가 이 문서들을 읽고 코드를 생성합니다.

## 시작하기

1. zip 압축 해제 후 폴더 위치를 작업할 곳으로 옮긴다 (예: `~/projects/withlab-ops`)
2. `git init` + 첫 커밋 (`docs: spec 문서 + Claude Code 컨텍스트 추가`)
3. Claude Code에서 해당 폴더를 연다
4. Claude Code에게 다음과 같이 지시:
   ```
   docs/specs/PHASE_00_프로젝트_셋업.md 를 읽고 작업 목록 순서대로 구현해줘.
   완료되면 /project:verify 실행해서 검증해줘.
   ```

## 워크플로우

```
Phase 0 구현 → /project:verify → ✅ 통과
              ↓
              Claude Design으로 시각 디자인 (외부 작업)
              ↓
              docs/REF_디자인_시스템.md 작성 + @theme 토큰 교체
              ↓
              /project:next-phase → Phase 1 시작
              ↓
              (Phase 1 스펙은 이 채팅으로 돌아와서 추가로 받기)
```

## 파일 구조

```
withlab-ops/
├── CLAUDE.md                      ← 루트 컨텍스트 (Claude Code 자동 참조)
├── .claude/commands/              ← 슬래시 커맨드 6개
├── docs/
│   ├── STATUS.md                  ← 진행 상태 추적
│   ├── REF_*.md                   ← 참조 문서 3개 (데이터모델/엑셀구조/DB스키마)
│   └── specs/PHASE_00_*.md        ← 현재 단계 스펙
└── src/                           ← 폴더별 CLAUDE.md (총 10개)
    ├── components/, hooks/, pages/, types/, utils/
    └── lib/{supabase,schemas,parsers,matching,generators}/
```

## 슬래시 커맨드 목록

| 커맨드 | 설명 |
|--------|------|
| `/project:verify` | 현재 단계 스펙 대비 종합 검증 |
| `/project:spec-reviewer` | 스펙 vs 구현 심층 비교 |
| `/project:next-phase` | 다음 단계로 전환 + STATUS.md 갱신 |
| `/project:check-types` | 타입 정합성 검증 |
| `/project:check-excel` | 엑셀 파서 검증 |
| `/project:generate-test` | 테스트 자동 생성 |

상세는 `CLAUDE.md`와 각 커맨드 파일 참조.
