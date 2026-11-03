import {
  GuideLink,
  H2,
  P,
  Step,
  Steps,
  Ui,
} from '@/components/guide/GuideBlocks'

export function AutoAllocationArticle() {
  return (
    <>
      <P>
        주문마다 아래 순서로 공급처를 찾습니다. 앞에서 찾으면 뒤 단계는 보지
        않습니다.
      </P>

      <H2 id="steps">공급처를 찾는 순서</H2>
      <Steps>
        <Step>
          품목 검토에서 고른 공급처: 품목 검토에서 이 과일의 공급처를 골랐으면
          그 공급처로 배정합니다. 공급처 배정에서 &quot;수정됨&quot;으로
          표시됩니다.
        </Step>
        <Step>
          품목 매핑: 상품명과 옵션이 같은 품목 매핑이 있으면 그 공급처로
          배정합니다. 공급처가 여러 개면 기본 공급처를 쓰고, 기본 공급처가
          품절이면 품절이 아닌 곳 중 가장 싼 곳을 씁니다.
        </Step>
        <Step>
          상품 목록 비교: 품목 매핑이 없으면 주문의 과일, 중량, 크기를 공급처
          상품 목록과 비교합니다. 하나로 확실하면 바로 배정하고, 비슷한 후보만
          있으면 &quot;추천&quot;으로 보여 줍니다.
        </Step>
        <Step>
          셋 다 없으면 &quot;미분류&quot;로 남습니다. 공급처를 직접 골라야
          합니다.
        </Step>
      </Steps>
      <P>
        공급처가 정해지면 상품명 변환이나 상품 목록에서 발주 상품명과 가격을
        찾습니다. 비활성 공급처로는 배정하지 않습니다.
      </P>

      <H2 id="improve">쓸수록 정확해집니다</H2>
      <P>
        미분류나 추천에 공급처를 지정하면 품목 매핑이 함께 등록됩니다. 이미
        배정된 품목은 <Ui>기본 매핑도 변경</Ui>으로 바꾸면 기본 공급처가
        바뀝니다. 다음 작업건부터는 2단계에서 바로 배정됩니다.
      </P>
      <P>
        과일, 중량, 크기를 어떻게 알아보는지는{' '}
        <GuideLink to="fruit-dictionary">과일 사전</GuideLink>에, 배정 결과를
        확인하고 고치는 방법은{' '}
        <GuideLink to="allocation">공급처 배정</GuideLink>에 있습니다.
      </P>
    </>
  )
}
