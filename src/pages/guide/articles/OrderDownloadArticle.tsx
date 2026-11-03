import {
  Callout,
  GuideLink,
  H2,
  P,
  Step,
  Steps,
  Table,
  Ui,
} from '@/components/guide/GuideBlocks'

export function OrderDownloadArticle() {
  return (
    <>
      <P>
        공급처별 발주서 엑셀을 내려받아 공급처에 보내는 단계입니다. 화면에는
        공급처마다 카드가 하나씩 나옵니다.
      </P>

      <H2 id="download">발주서 내려받기</H2>
      <P>
        한 공급처만 받으려면 그 카드의 <Ui>다운로드</Ui>를 누릅니다. 그 공급처의
        발주서 1개가 내려받아집니다.
      </P>
      <P>
        모두 받으려면 위쪽의 <Ui>전체 다운로드</Ui>를 누릅니다. 공급처별 파일이
        각각 내려받아집니다. 양식을 등록하지 않은 공급처는 빠집니다.
      </P>
      <Callout tone="warn">
        카드에 &quot;양식이 등록되지 않았습니다&quot;가 보이면 카드의{' '}
        <Ui>양식 관리</Ui> 링크에서 그 공급처의 발주서 양식을 등록하세요. 등록
        방법은 <GuideLink to="order-template">발주서 양식</GuideLink> 글에
        있습니다.
      </Callout>

      <H2 id="complete">발주 완료 처리</H2>
      <Steps>
        <Step>
          발주서를 모두 공급처에 보낸 뒤 <Ui>발주 완료 처리</Ui>를 누릅니다.
        </Step>
        <Step>
          안내를 확인하고 <Ui>발주 완료</Ui>를 누릅니다.
        </Step>
        <Step>작업건 상태가 &quot;발주완료&quot;로 바뀝니다.</Step>
      </Steps>
      <P>
        미배정 주문이 있으면 완료되지 않습니다. 양식을 등록하지 않은 공급처가
        있으면 수동 발주 확인에 체크하세요.
      </P>
      <Callout>
        발주 완료 후에는 주문을 올리거나 교체할 수 없습니다. 운송장은 진행중
        작업건이라도 배정이 있으면 올릴 수 있습니다.
      </Callout>

      <H2 id="price-summary">가격정리 내려받기</H2>
      <P>
        발주서 카드 아래 &quot;가격정리&quot;에서 주문 목록별로 구매가격과
        판매금액이 들어간 엑셀을 받습니다. 발주 완료 전에도 받을 수 있습니다.
      </P>
      <Table
        headers={['버튼', '동작']}
        rows={[
          [
            <Ui key="check">금액 확인</Ui>,
            '주문별 단가, 구매가격, 판매금액을 봅니다.',
          ],
          [
            <Ui key="download">다운로드</Ui>,
            '최초 파일명에 "_가격정리"를 붙여 저장합니다.',
          ],
          [
            <Ui key="refresh">새로고침</Ui>,
            '배정을 바꾼 뒤 최신 내용으로 다시 불러옵니다.',
          ],
        ]}
      />
      <P>
        단가가 없거나 미배정인 주문이 있으면 금액 확인 창이 뜹니다.{' '}
        <Ui>빈칸으로 다운로드</Ui>를 누르면 그 금액만 비워서 받습니다.
      </P>
      <Callout>
        택배사와 운송장번호는 가격정리에 들어가지 않습니다. 운송장 3단계에서
        복사해 넣습니다. 방법은 <GuideLink to="tracking">운송장 처리</GuideLink>{' '}
        글에 있습니다.
      </Callout>

      <H2 id="revert">발주 되돌리기</H2>
      <P>
        발주 완료 후 배정을 고쳐야 할 때 씁니다. 기존 배정은 그대로 남습니다.
      </P>
      <Steps>
        <Step>
          발주서 다운로드 화면 위쪽의 초록 배너에서 <Ui>발주 되돌리기</Ui>를
          누릅니다.
        </Step>
        <Step>
          확인창에서 <Ui>되돌리기</Ui>를 누릅니다.
        </Step>
        <Step>
          작업건이 &quot;진행중&quot;으로 돌아가고 배정을 고칠 수 있습니다.
        </Step>
      </Steps>
      <Callout tone="warn">
        운송장 처리까지 완료한 작업건은 되돌릴 수 없습니다.
      </Callout>

      <H2 id="delete-supplier">공급처별 배정 삭제</H2>
      <P>
        한 공급처의 배정만 취소할 때 씁니다. 작업건이 &quot;진행중&quot;일 때만
        됩니다.
      </P>
      <Steps>
        <Step>그 공급처 카드의 휴지통 아이콘을 누릅니다.</Step>
        <Step>
          확인창에서 <Ui>삭제</Ui>를 누릅니다.
        </Step>
        <Step>
          그 공급처에 배정됐던 주문이 미분류로 돌아갑니다. 공급처 배정에서 다시
          배정하세요.
        </Step>
      </Steps>

      <H2 id="delete-session">작업건 삭제</H2>
      <P>
        작업건 목록에서 그 작업건 오른쪽의 휴지통 아이콘을 누르고, 확인창에서{' '}
        <Ui>삭제</Ui>를 누릅니다. 작업건에 속한 주문, 배정, 운송장이 모두
        지워집니다.
      </P>
      <Callout tone="warn">
        삭제한 작업건은 되돌릴 수 없습니다. 누르기 전에 작업건 이름을 한 번 더
        확인하세요.
      </Callout>
    </>
  )
}
