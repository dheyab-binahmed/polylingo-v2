import fs from "fs";
import path from "path";

describe("WebRTC ICE Configuration", () => {
  let fileContent;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      "../components/components/partners/DMModal.jsx",
    );
    fileContent = fs.readFileSync(filePath, "utf8");
  });

  test("has Metered STUN server", () => {
    expect(fileContent).toContain("stun:stun.relay.metered.ca:80");
  });

  test("has TURN server on port 80", () => {
    expect(fileContent).toContain("turn:global.relay.metered.ca:80");
  });

  test("has TURN server on port 80 TCP", () => {
    expect(fileContent).toContain("turn:global.relay.metered.ca:80?transport=tcp");
  });

  test("has TURN server on port 443", () => {
    expect(fileContent).toContain("turn:global.relay.metered.ca:443");
  });

  test("has TURNS server on port 443 TCP", () => {
    expect(fileContent).toContain("turns:global.relay.metered.ca:443?transport=tcp");
  });

  test("has correct username", () => {
    expect(fileContent).toContain("6581927f246d886071999175");
  });

  test("has correct credential", () => {
    expect(fileContent).toContain("zG5aDkE2qoxGbHHR");
  });

  test("has iceCandidatePoolSize of 10", () => {
    expect(fileContent).toContain("iceCandidatePoolSize: 10");
  });

  test("does not contain old openrelay TURN server", () => {
    expect(fileContent).not.toContain("openrelay.metered.ca");
  });

  test("does not contain old free TURN credentials", () => {
    expect(fileContent).not.toContain("openrelayproject");
  });
});
