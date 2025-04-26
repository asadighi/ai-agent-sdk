meshes/{meshId}:
  metadata:
    - leaders: [agentId1, agentId2, ...]
    - primaryLeader: agentId1
    - createdAt
    - status: active | stopped

meshes/{meshId}/agents/{agentId}:
  role: active | leader | observer | public | banned
  memory:
    - private: {}
    - internal: {}
    - public: {}
  status: healthy | disconnected | removed
  heartbeat: timestamp

meshes/{meshId}/events/{eventId}:
  from: agentId
  type: action | state_update
  payload: {}
  permission: 
    - scope: public | internal | private
  timestamp