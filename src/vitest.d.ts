// jest-dom matchers (toBeInTheDocument 등)의 타입 증강을 tsc에 노출한다.
// 런타임 등록은 vitest.setup.ts가 하지만, 그 파일은 tsconfig `include: ["src"]`
// 밖이라 타입체크에는 보이지 않는다 → src 안의 이 선언으로 vitest Assertion을 증강.
import "@testing-library/jest-dom/vitest";
