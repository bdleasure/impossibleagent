[Skip to content](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/#_top)

# Human in the Loop

Copy Page

### What is Human-in-the-Loop?

Human-in-the-Loop (HITL) workflows integrate human judgment and oversight into automated processes. These workflows pause at critical points for human review, validation, or decision-making before proceeding. This approach combines the efficiency of automation with human expertise and oversight where it matters most.

![A human-in-the-loop diagram](https://developers.cloudflare.com/_astro/human-in-the-loop.Bx0axRJl_1vt7N8.svg)

#### Understanding Human-in-the-Loop workflows

In a Human-in-the-Loop workflow, processes are not fully automated. Instead, they include designated checkpoints where human intervention is required. For example, in a travel booking system, a human may want to confirm the travel before an agent follows through with a transaction. The workflow manages this interaction, ensuring that:

1. The process pauses at appropriate review points
2. Human reviewers receive necessary context
3. The system maintains state during the review period
4. Review decisions are properly incorporated
5. The process continues once approval is received

### Best practices for Human-in-the-Loop workflows

#### Long-Term State Persistence

Human review processes do not operate on predictable timelines. A reviewer might need days or weeks to make a decision, especially for complex cases requiring additional investigation or multiple approvals. Your system needs to maintain perfect state consistency throughout this period, including:

- The original request and context
- All intermediate decisions and actions
- Any partial progress or temporary states
- Review history and feedback

#### Continuous Improvement Through Evals

Human reviewers play a crucial role in evaluating and improving LLM performance. Implement a systematic evaluation process where human feedback is collected not just on the final output, but on the LLM's decision-making process. This can include:

- Decision Quality Assessment: Have reviewers evaluate the LLM's reasoning process and decision points, not just the final output.
- Edge Case Identification: Use human expertise to identify scenarios where the LLM's performance could be improved.
- Feedback Collection: Gather structured feedback that can be used to fine-tune the LLM or adjust the workflow. [AI Gateway](https://developers.cloudflare.com/ai-gateway/evaluations/add-human-feedback/) can be a useful tool for setting up an LLM feedback loop.

#### Error handling and recovery

Robust error handling is essential for maintaining workflow integrity. Your system should gracefully handle various failure scenarios, including reviewer unavailability, system outages, or conflicting reviews. Implement clear escalation paths for handling exceptional cases that fall outside normal parameters.

The system should maintain stability during paused states, ensuring that no work is lost even during extended review periods. Consider implementing automatic checkpointing that allows workflows to be resumed from the last stable state after any interruption.

## Was this helpful?

- **Resources**
- [API](https://developers.cloudflare.com/api/)
- [New to Cloudflare?](https://developers.cloudflare.com/fundamentals/)
- [Products](https://developers.cloudflare.com/products/)
- [Sponsorships](https://developers.cloudflare.com/sponsorships/)
- [Open Source](https://github.com/cloudflare)

- **Support**
- [Help Center](https://support.cloudflare.com/)
- [System Status](https://www.cloudflarestatus.com/)
- [Compliance](https://www.cloudflare.com/trust-hub/compliance-resources/)
- [GDPR](https://www.cloudflare.com/trust-hub/gdpr/)

- **Company**
- [cloudflare.com](https://www.cloudflare.com/)
- [Our team](https://www.cloudflare.com/people/)
- [Careers](https://www.cloudflare.com/careers/)

- **Tools**
- [Cloudflare Radar](https://radar.cloudflare.com/)
- [Speed Test](https://speed.cloudflare.com/)
- [Is BGP Safe Yet?](https://isbgpsafeyet.com/)
- [RPKI Toolkit](https://rpki.cloudflare.com/)
- [Certificate Transparency](https://ct.cloudflare.com/)

- **Community**
- [X](https://x.com/cloudflare)
- [Discord](http://discord.cloudflare.com/)
- [YouTube](https://www.youtube.com/cloudflare)
- [GitHub](https://github.com/cloudflare/cloudflare-docs)

- 2025 Cloudflare, Inc.
- [Privacy Policy](https://www.cloudflare.com/privacypolicy/)
- [Terms of Use](https://www.cloudflare.com/website-terms/)
- [Report Security Issues](https://www.cloudflare.com/disclosure/)
- [Trademark](https://www.cloudflare.com/trademark/)
- Cookie Settings