const ChannelList = ({ channels, workspaceId }) => {
  const publicChannels = channels.filter((c) => c.type === "PUBLIC")
  const privateChannels = channels.filter((c) => c.type === "PRIVATE")

  return (
    <div className="p-3 space-y-3">
      {channels.length === 0 && (
        <div className="text-center py-8 text-[#52656A]">
          <i className="fa-solid fa-inbox text-2xl mb-2 block opacity-50" />
          <p className="text-xs">No channels yet</p>
        </div>
      )}

      {/* Public Channels */}
      {publicChannels.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#52656A] uppercase tracking-widest px-2 mb-2 opacity-75">
            Public
          </h3>
          <div className="space-y-1">
            {publicChannels.map((channel) => (
              <div
                key={channel.id}
                className="px-3 py-2.5 rounded-md text-sm text-[#2C3333] hover:bg-white cursor-pointer transition"
              >
                <i className="fa-solid fa-hashtag text-xs text-[#52656A] mr-2 opacity-75" />
                <span className="font-medium">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Private Channels */}
      {privateChannels.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#52656A] uppercase tracking-widest px-2 mb-2 opacity-75">
            Private
          </h3>
          <div className="space-y-1">
            {privateChannels.map((channel) => (
              <div
                key={channel.id}
                className="px-3 py-2.5 rounded-md text-sm text-[#2C3333] hover:bg-white cursor-pointer transition"
              >
                <i className="fa-solid fa-lock text-xs text-[#52656A] mr-2 opacity-75" />
                <span className="font-medium">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChannelList
