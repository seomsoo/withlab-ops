import {
  AppLink,
  Bullet,
  Bullets,
  GuideLink,
  H2,
  H3,
  P,
  Step,
  Steps,
  Ui,
} from '@/components/guide/GuideBlocks'

export function GettingStartedArticle() {
  return (
    <>
      <H2 id="setup">처음 해 둘 설정</H2>
      <P>아래 세 가지를 먼저 해 두면 바로 시작할 수 있습니다.</P>

      <H3>1. 공급처 등록</H3>
      <P>
        거래처를 등록하고 공급처 상세에서 발주서 양식과 상품 목록을 올립니다.
        발주서 양식이 없으면 발주서를 내려받을 수 없습니다.{' '}
        <AppLink to="/mapping/suppliers">공급처 관리 열기</AppLink>
      </P>

      <H3>2. 운송장 양식 등록</H3>
      <P>
        쿠팡과 토스 셀러에서 다운받은 빈 운송장 양식 파일을 올립니다. 나중에
        운송장을 다운로드할 때 필요합니다.{' '}
        <AppLink to="/settings/platform-template">운송장 양식 열기</AppLink>
      </P>

      <H3>3. 과일 사전 등록</H3>
      <P>
        공급처 상품명과 가격을 자동으로 넣으려면 필요합니다. 사전에 없는 과일은
        공급처 상품을 직접 골라야 합니다.{' '}
        <AppLink to="/mapping/dictionary">과일 사전 열기</AppLink>
      </P>

      <H2 id="order">발주 순서</H2>
      <Steps>
        <Step>
          로그인한 뒤 대시보드에서 <Ui>새 발주 작업 시작</Ui>을 누릅니다.
        </Step>
        <Step>쿠팡, 토스 주문 엑셀을 하나씩 올립니다.</Step>
        <Step>
          품목 검토에서 오늘 주요 품목의 공급처를 미리 고릅니다. 건너뛰어도
          됩니다.
        </Step>
        <Step>
          공급처 배정에서 &quot;미분류&quot;, &quot;추천&quot;, &quot;가격
          미확인&quot;을 처리합니다.
        </Step>
        <Step>
          공급처별 발주서를 다운로드해서 카톡이나 이메일로 공급처에 보냅니다.
        </Step>
        <Step>
          <Ui>발주 완료 처리</Ui>를 누릅니다.
        </Step>
      </Steps>
      <P>
        단계별 자세한 설명은{' '}
        <GuideLink to="order-upload">작업건 만들고 주문 올리기</GuideLink>부터
        차례로 보면 됩니다.
      </P>

      <H2 id="tracking">운송장 순서</H2>
      <Steps>
        <Step>공급처에서 운송장을 보내 주면 운송장 엑셀을 올립니다.</Step>
        <Step>
          매칭 결과를 확인합니다. &quot;미매칭&quot;이 있으면 직접 연결합니다.
        </Step>
        <Step>
          쿠팡, 토스 운송장 파일을 다운로드해서 각 플랫폼 셀러에 올립니다.
        </Step>
        <Step>
          <Ui>운송장 처리 완료</Ui>를 누릅니다.
        </Step>
      </Steps>
      <P>
        자세한 설명은 <GuideLink to="tracking">운송장 처리</GuideLink>에
        있습니다.
      </P>

      <H2 id="dashboard">대시보드</H2>
      <P>로그인하면 처음 보이는 화면입니다.</P>
      <Bullets>
        <Bullet>
          빠른 작업: <Ui>새 발주 작업 시작</Ui>, <Ui>운송장 매칭 시작</Ui>
        </Bullet>
        <Bullet>
          최근 작업건: 최근 5건과 상태를 보여 줍니다. <Ui>전체 보기</Ui>를
          누르면 전체 목록으로 이동합니다.
        </Bullet>
        <Bullet>바로가기: 매핑 관리, 양식 관리, 공급처 관리</Bullet>
      </Bullets>
      <P>
        작업건을 누르면 진행 단계에 맞는 화면으로 이동합니다. 작업건 상태는
        파란색이 진행중, 초록색이 발주완료, 회색이 완료입니다.
      </P>
    </>
  )
}
