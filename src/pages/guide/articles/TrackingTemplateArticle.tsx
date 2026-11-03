import {
  AppLink,
  Callout,
  GuideLink,
  H2,
  P,
  Step,
  Steps,
  Table,
  Ui,
} from '@/components/guide/GuideBlocks'

export function TrackingTemplateArticle() {
  return (
    <>
      <P>
        쿠팡·토스 셀러 페이지에서 운송장을 일괄 등록할 때 쓰는 양식 파일입니다.
        이 양식에 택배사 이름과 운송장번호를 자동으로 채워 줍니다.
      </P>
      <P>
        메뉴 위치는 사이드바 설정의 <Ui>운송장 양식</Ui>입니다.{' '}
        <AppLink to="/settings/platform-template">운송장 양식 열기</AppLink>
      </P>
      <P>
        공급처가 보내는 운송장 파일의 양식은 다른 설정입니다.{' '}
        <GuideLink to="suppliers">공급처 관리</GuideLink> 글을 참고하세요.
      </P>

      <H2 id="register">양식 등록하기</H2>
      <Steps>
        <Step>상단에서 쿠팡이나 토스 탭을 고릅니다.</Step>
        <Step>
          <Ui>양식 등록</Ui>이나 <Ui>양식 변경</Ui>을 누릅니다.
        </Step>
        <Step>셀러 페이지에서 받은 양식 파일(.xlsx)을 올립니다.</Step>
        <Step>
          <Ui>다음</Ui>을 누르고 시트, 헤더 행 번호, 데이터 시작 행 번호를
          확인합니다.
        </Step>
        <Step>열 위치를 드롭다운에서 고릅니다.</Step>
        <Step>
          미리보기를 확인하고 <Ui>저장</Ui>을 누릅니다.
        </Step>
      </Steps>

      <H2 id="columns">열 위치 설정</H2>
      <Table
        headers={['설정', '하는 일', '예시']}
        rows={[
          [
            '매칭키 컬럼',
            '플랫폼 매칭번호가 있는 열',
            '쿠팡: 묶음배송번호 관련 열',
          ],
          ['택배사 컬럼', '택배사 이름을 채울 열', '쿠팡: D열(4)'],
          ['운송장번호 컬럼', '운송장번호를 채울 열', '쿠팡: E열(5)'],
          ['주문상태 컬럼', '토스만. "배송중"을 채울 열', '토스: D열(4)'],
          ['주문상태 변경값', '토스만. 채울 글자', '배송중'],
        ]}
      />
      <P>
        같은 열을 두 번 고를 수 없습니다. 토스는 주문상태 컬럼이 필수입니다.
      </P>
      <Callout>
        쿠팡이나 토스가 양식을 바꾸면 <Ui>양식 변경</Ui>으로 새 파일을 올리고 열
        위치를 다시 확인하세요.
      </Callout>
    </>
  )
}
