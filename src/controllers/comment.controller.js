import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  try {
    const allComments = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId), // When matching the raw Video id to video id in Database
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: parseInt(limit, 10),
      },
    ]);
    return res
      .status(200)
      .json(new ApiResponse(200, { allComments }, "Success"));
  } catch (e) {
    throw new ApiError(400, e.message);
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  try {
    const { content } = req.body;

    const userid = req.user._id;
    const { videoId } = req.params;
    if (!content) throw new ApiError(404, "Comment Required");
    const addComments = Comment.create({
      content: content,
      owner: new mongoose.Types.ObjectId(userid),
      video: new mongoose.Types.ObjectId(videoId),
    });
    if (!addComments) throw new ApiError(500, "Something went wrong");
    return res
      .status(200)
      .json(new ApiResponse(200, { addComments: addComments }, "Success"));
  } catch (e) {
    throw new ApiError(400, e.message || "Not able to add a comment");
  }
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  try {
    const { content } = req.body;
    const { commentId } = req.params;
    if (!content) throw new ApiError(404, "Comment Required");
    const updateComments = await Comment.findByIdAndUpdate(
      commentId,
      {
        content: content,
      },
      { new: true }
    );
    if (!updateComments) throw new ApiError(500, "Something went wrong");
    return res
      .status(200)
      .json(new ApiResponse(200, { updateComments }, "Success"));
    
  } catch (e) {
    throw new ApiError(400, e.message || "Not able to update a comment");
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
