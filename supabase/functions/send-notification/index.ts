import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const FROM_EMAIL = "grove@sprout.ph" // Update to a verified Resend sender domain

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping email"); return }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
}

serve(async (req) => {
  const { type, payload } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  if (type === "nursery-submitted") {
    const { data: execomUsers } = await supabase
      .from("profiles").select("id, email, display_name").eq("is_execom", true)
    if (!execomUsers?.length) return new Response("ok", { status: 200 })

    await supabase.from("notifications").insert(
      execomUsers.map(u => ({ user_id: u.id, type, payload, read: false }))
    )
    await Promise.all(execomUsers.map(u => sendEmail(
      u.email,
      `[Grove] ${payload.project_name} submitted for Nursery review`,
      `<p>Hi ${u.display_name},</p><p><strong>${payload.builder_email}</strong> submitted <strong>${payload.project_name}</strong> for ExCom review.</p><p>Review it in <a href="https://sprout-garden.vercel.app">Grove</a>.</p>`,
    )))
  }

  else if (type === "plant-approved") {
    const { data: builder } = await supabase
      .from("profiles").select("id, email, display_name").eq("email", payload.builder_email).maybeSingle()
    if (builder) {
      await supabase.from("notifications").insert({ user_id: builder.id, type, payload, read: false })
      await sendEmail(
        builder.email,
        `[Grove] ${payload.project_name} approved by ExCom!`,
        `<p>Hi ${builder.display_name},</p><p>Your project <strong>${payload.project_name}</strong> was approved by ExCom and is now in the Sprout stage. Time to build!</p>`,
      )
    }
  }

  else if (type === "plant-needs-rework") {
    const { data: builder } = await supabase
      .from("profiles").select("id, email, display_name").eq("email", payload.builder_email).maybeSingle()
    if (builder) {
      await supabase.from("notifications").insert({ user_id: builder.id, type, payload, read: false })
      await sendEmail(
        builder.email,
        `[Grove] ${payload.project_name} — ExCom feedback`,
        `<p>Hi ${builder.display_name},</p><p>ExCom reviewed <strong>${payload.project_name}</strong> and has feedback:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${payload.review_comment}</blockquote><p>Your project is back in the Seedling stage. Address the feedback and resubmit when ready.</p>`,
      )
    }
  }

  else if (type === "seed-unclaimed") {
    const { data: wisher } = await supabase
      .from("profiles").select("id").eq("email", payload.wisher_email).maybeSingle()
    if (wisher) {
      await supabase.from("notifications").insert({ user_id: wisher.id, type, payload, read: false })
      // No email for unclaim — in-app only
    }
  }

  return new Response("ok", { status: 200 })
})
