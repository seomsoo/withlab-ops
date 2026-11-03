import {
  AppLink,
  Callout,
  Example,
  GuideLink,
  H2,
  P,
  Step,
  Steps,
  Table,
  Ui,
} from '@/components/guide/GuideBlocks'

export function NameMappingArticle() {
  return (
    <>
      <P>
        상품명 변환은 플랫폼 상품명을 공급처가 알아보는 이름으로 바꾸는
        규칙입니다. 바꾼 이름이 발주서에 들어갑니다.
      </P>
      <P>
        메뉴 위치는 <Ui>매핑관리</Ui> → <Ui>상품명 변환</Ui>입니다.{' '}
        <AppLink to="/mapping/names">상품명 변환 열기</AppLink>
      </P>
      <Example>
        &quot;프리미엄 산지직송 사과 세트 3kg&quot; → &quot;사과 3kg&quot;
        <br />
        &quot;[특가] 성주 꿀참외 혼합과 5kg&quot; → &quot;참외 혼합 5kg&quot;
      </Example>

      <H2 id="difference">품목 매핑과 다른 점</H2>
      <P>
        <GuideLink to="product-mapping">품목 매핑</GuideLink>은 이 상품을 어느
        공급처로 보낼지 정하는 배정 규칙입니다. 상품명 변환은 발주서에 이 상품을
        어떤 이름으로 적을지 정하는 이름 규칙입니다.
      </P>

      <H2 id="add">상품명 변환 추가하기</H2>
      <Steps>
        <Step>
          <Ui>매핑 추가</Ui>를 누릅니다.
        </Step>
        <Step>아래 항목을 적습니다.</Step>
        <Step>
          <Ui>매핑 추가</Ui>를 눌러 저장합니다. 고칠 때는 <Ui>수정 저장</Ui>을
          누릅니다.
        </Step>
      </Steps>
      <Table
        headers={['칸', '적는 내용', '예시']}
        rows={[
          ['플랫폼', '쿠팡, 토스, 공통 중 선택. 필수', '공통'],
          [
            '플랫폼 상품명',
            '플랫폼에서 들어오는 상품명. 정확히 적습니다. 필수',
            '산지직송 성주 꿀참외',
          ],
          [
            '플랫폼 옵션명',
            '옵션까지 정확히 같아야 적용. 비우면 옵션이 없는 주문에만 적용',
            '1박스 특가혼합과 5kg',
          ],
          ['공급처', '이 변환을 적용할 공급처. 필수', 'A농장'],
          ['공급처 상품명', '발주서에 적힐 이름. 필수', '정품 참외 중소과 5kg'],
          ['공급처 상품코드', '공급처 자체 상품 코드', 'PIDY82D'],
        ]}
      />
      <P>
        공급처 상품명에는 공급처가 &quot;이 이름으로 보내 주세요&quot;라고 한
        이름을 넣습니다.
      </P>
      <P>
        공급처를 먼저 고르면, 공급처 상품명 칸을 눌렀을 때 상품 목록이 나옵니다.
        목록에서 고르면 상품코드도 함께 채워집니다.
      </P>
      <Callout tone="warn">
        상품명 변환은 배정할 때 적용됩니다. 이미 배정된 주문에는 반영되지
        않습니다.
      </Callout>

      <H2 id="suggest">자동 매칭 제안</H2>
      <P>
        상단의 <Ui>자동 매칭 제안</Ui>을 누르면, 상품명 변환이 없는 품목 매핑에
        대해 비슷한 공급처 상품을 찾아 줍니다.
      </P>
      <P>
        50% 이상 비슷한 항목은 미리 체크되어 있습니다. 맞는 항목만 체크하고{' '}
        <Ui>N건 등록</Ui>을 누르세요.
      </P>
    </>
  )
}
