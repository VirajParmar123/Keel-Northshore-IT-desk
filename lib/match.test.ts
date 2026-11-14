import assert from "node:assert/strict"
import { test } from "node:test"
import { matchQuery } from "./match"
import { STARTER_PROMPTS } from "./prompts"
import { createSeed } from "./seed"

const articles = createSeed().articles

function answered(query: string) {
  const result = matchQuery(query, articles)
  assert.equal(result.type, "answer", `${query} -> ${result.type}`)
  if (result.type !== "answer") throw new Error("unreachable")
  return result.articleId
}

test("vpn wake matches the stored GlobalProtect answer", () => {
  assert.equal(answered("vpn keeps dropping when my laptop wakes up"), "kb-vpn")
})

test("wifi password matches the office network answer", () => {
  assert.equal(answered("what's the wifi password"), "kb-wifi")
})

test("visitor wifi matches the guest answer", () => {
  assert.equal(answered("guest wifi for a client visiting today"), "kb-guest")
})

test("papercut matches follow-me printing", () => {
  assert.equal(answered("papercut won't release my job"), "kb-print")
})

test("paper jam matches the floor 4 Canon answer", () => {
  assert.equal(answered("paper jam on the floor 4 canon"), "kb-jam")
})

test("mfa lockout matches the factor answer", () => {
  assert.equal(answered("okta says too many codes and I'm locked out"), "kb-mfa")
})

test("reset password matches Okta, not the wifi card", () => {
  assert.equal(answered("I need to reset my password"), "kb-okta-password")
})

test("phishing email does not become a password reset", () => {
  assert.equal(answered("I got a weird email asking for my okta password"), "kb-phish")
})

test("zoom silence matches audio, not the camera answer", () => {
  assert.equal(answered("zoom has no sound and I can't hear anyone"), "kb-zoom-audio")
})

test("black zoom camera matches the camera answer", () => {
  assert.equal(answered("zoom camera is black"), "kb-zoom-camera")
})

test("loud fan matches the slow laptop answer", () => {
  assert.equal(answered("my laptop fan is loud and the mac is hot"), "kb-slow")
})

test("new hire matches onboarding", () => {
  assert.equal(answered("a new hire starts monday and the laptop is not ready"), "kb-hire")
})

test("unknown question is a miss, not a guess", () => {
  assert.equal(matchQuery("the coffee machine on 4 is leaking", articles).type, "miss")
})

test("asking for a person escalates", () => {
  assert.equal(matchQuery("this is useless, talk to a real person", articles).type, "escalate")
})

test("a bare password is ambiguous", () => {
  const result = matchQuery("password", articles)
  assert.equal(result.type, "clarify")
})

test("a bare printer is ambiguous between release and jam", () => {
  const result = matchQuery("printer", articles)
  assert.equal(result.type, "clarify")
})

test("every starter prompt resolves to one stored answer", () => {
  for (const prompt of STARTER_PROMPTS) {
    assert.equal(matchQuery(prompt, articles).type, "answer", prompt)
  }
})
