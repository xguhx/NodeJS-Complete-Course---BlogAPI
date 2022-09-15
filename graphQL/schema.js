const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Post {
        _id:ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type PostData {
        posts:[Post!]!
        totalPosts: Int!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        post:[Post!]!
    }

    type AuthData {
        token:String!
        userID: String!
    }
    
    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    input UserInputData {
        email: String!
        name: String!
        password:String!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts(page: Int): PostData!
        post(postId: ID!): Post!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(postId: ID!, postInput: PostInputData): Post!
        deletePost(postId: ID!): Boolean!
    }

    schema {
        query:RootQuery
        mutation: RootMutation
    }
`);
