import {
  Bullet,
  Bullets,
  Callout,
  GuideLink,
  H2,
  P,
  Step,
  Steps,
  Ui,
} from '@/components/guide/GuideBlocks'

export function SimpleTrackingArticle() {
  return (
    <>
      <P>
        간편 운송장은 작업건 없이 운송장을 빠르게 처리하는 방법입니다. 주문
        파일과 운송장 파일을 올리면 바로 매칭하고 플랫폼 파일을 만듭니다.
      </P>
      <Callout tone="warn">
        간편 운송장은 저장되지 않습니다. 화면을 벗어나면 올린 내용이 모두
        사라집니다. 파일을 꼭 내려받은 뒤에 화면을 나가세요.
      </Callout>

      <H2 id="start">시작하기</H2>
      <P>
        사이드바에서 <Ui>운송장</Ui>을 누르고, 화면 오른쪽 위{' '}
        <Ui>간편 운송장</Ui>을 누릅니다.
      </P>

      <H2 id="steps">처리 순서</H2>
      <Steps>
        <Step>
          쿠팡·토스 주문 엑셀을 올립니다. 파일마다 읽은 건수가 나옵니다.
        </Step>
        <Step>
          공급처를 고르고 운송장 엑셀을 올립니다. 올리는 즉시 주문과 자동으로
          매칭됩니다. 여러 공급처 운송장을 차례로 올릴 수 있습니다.
        </Step>
        <Step>파일 행의 상세 보기를 펼쳐 매칭 결과를 확인합니다.</Step>
        <Step>
          결과 표를 전체, 매칭, 미매칭으로 걸러 보고 쿠팡·토스 플랫폼 파일을
          내려받습니다.
        </Step>
      </Steps>
      <P>
        간편 운송장의 <Ui>전체 다운로드</Ui>는 합쳐진 파일 1개로 받습니다.
      </P>

      <H2 id="difference">일반 운송장과 다른 점</H2>
      <Bullets>
        <Bullet>
          수동 매칭이 없습니다. 미매칭 건은 플랫폼 파일에서 빠집니다.
        </Bullet>
        <Bullet>주문번호 없는 운송장 경고가 나오지 않습니다.</Bullet>
        <Bullet>가격정리에 운송장 붙여넣기가 없습니다.</Bullet>
      </Bullets>
      <P>
        이 기능이 필요하면 <GuideLink to="tracking">운송장 처리</GuideLink>의
        일반 운송장 방식을 쓰세요.
      </P>
    </>
  )
}
