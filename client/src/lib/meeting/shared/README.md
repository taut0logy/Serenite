# Wire protocol

Event names, payload schemas and codec/simulcast profiles, shared with the
meet service. `meet/src/shared/` holds the same definitions.

These two copies are the wire contract between the browser and the SFU and
**must stay identical**. They are duplicated rather than shared through a
workspace package because the two live in separate deployable projects; a
change to one is only correct if the same change lands in the other.
