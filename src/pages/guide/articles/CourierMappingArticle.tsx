import {
  AppLink,
  Callout,
  Example,
  H2,
  P,
  Step,
  Steps,
  Table,
  Ui,
} from '@/components/guide/GuideBlocks'

export function CourierMappingArticle() {
  return (
    <>
      <P>
        운송장에 적힌 택배사 이름을 쿠팡·토스가 알아보는 정식 이름으로 바꿉니다.
        한 번 등록하면 모든 공급처에 똑같이 적용됩니다.
      </P>
      <P>
        메뉴 위치는 <Ui>매핑관리</Ui> → <Ui>택배사 매핑</Ui>입니다.{' '}
        <AppLink to="/mapping/couriers">택배사 매핑 열기</AppLink>
      </P>
      <Example>
        운송장의 &quot;대한통운&quot; → 쿠팡·토스에는 &quot;CJ 대한통운&quot;
        <br />
        운송장의 &quot;로젠&quot; → &quot;로젠택배&quot;
      </Example>

      <H2 id="why">등록해야 하는 이유</H2>
      <P>
        택배사 매핑이 없으면 운송장에 적힌 이름이 그대로 쿠팡·토스 파일에
        들어갑니다. 이름이 맞지 않으면 플랫폼에 올릴 때 오류가 날 수 있으니 미리
        등록해 두세요.
      </P>
      <P>
        예를 들어 &quot;대한통운&quot;을 한 번 등록하면 A농장, B농장 어디서 보낸
        운송장이든 자동으로 바뀝니다.
      </P>

      <H2 id="add">택배사 매핑 추가하기</H2>
      <Steps>
        <Step>
          오른쪽 위 <Ui>매핑 추가</Ui>를 누릅니다.
        </Step>
        <Step>아래 세 칸을 적습니다. 모두 필수입니다.</Step>
        <Step>
          <Ui>매핑 추가</Ui>를 눌러 저장합니다.
        </Step>
      </Steps>
      <Table
        headers={['칸', '적는 내용', '예시']}
        rows={[
          [
            '원본 택배사명',
            '운송장에 적힌 택배사 이름. 정확히 같아야 바뀝니다',
            '대한통운',
          ],
          ['쿠팡 택배사명', '쿠팡에 올릴 때 넣을 이름', 'CJ 대한통운'],
          ['토스 택배사명', '토스에 올릴 때 넣을 이름', 'CJ대한통운'],
        ]}
      />
      <Callout>
        원본 택배사명은 전체에서 하나만 등록할 수 있습니다. 수정과 삭제는 표의
        각 행에서 합니다.
      </Callout>
    </>
  )
}
