# TODO

Planned and in-progress work for FitPal, ordered by priority.

| Priority | Task | Notes |
| --- | --- | --- |
| High | Easy install & release | Publish a versioned release with a one-step install path (e.g. a prebuilt Docker image) so users can run FitPal without manual setup. |
| Medium | Native provider support | Add dedicated Anthropic (`@ai-sdk/anthropic`) and Google (`@ai-sdk/google`) providers so users can target those APIs directly, without an OpenAI-compatible gateway. |
| Medium | Reduce duplicated code | Consolidate repeated logic across the server and components into shared helpers. |
