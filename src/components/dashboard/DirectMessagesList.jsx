import PropTypes from "prop-types"

const DirectMessagesList = ({
  members,
  selectedUser,
  onSelectUser,
  currentUserId,
}) => {
 
  const availableUsers = members.filter((m) => m.id !== currentUserId)

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
     
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-lg text-gray-900">Direct Messages</h2>
        <p className="text-xs text-gray-500 mt-1">
          {availableUsers.length} member{availableUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

   
      <div className="flex-1 overflow-y-auto">
        {availableUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No other members in this workspace
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {availableUsers.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onSelectUser(member)}
                  className={`w-full text-left px-4 py-3 transition ${
                    selectedUser?.id === member.id
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                        selectedUser?.id === member.id
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      }`}
                    >
                      {member.username?.[0]?.toUpperCase() || "?"}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {member.username || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email || ""}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

DirectMessagesList.propTypes = {
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string,
      email: PropTypes.string,
    }),
  ),
  selectedUser: PropTypes.shape({
    id: PropTypes.string,
  }),
  onSelectUser: PropTypes.func.isRequired,
  currentUserId: PropTypes.string,
}

DirectMessagesList.defaultProps = {
  members: [],
  selectedUser: null,
  currentUserId: null,
}

export default DirectMessagesList
