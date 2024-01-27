import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "This video id is not valid");
  }

  // find video in database
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video not found");
  }

  // match and finds all the comments
  const aggregateComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
  ]);

  Comment.aggregatePaginate(aggregateComments, {
    page,
    limit,
  })
    .then((result) => {
      return res
        .status(201)
        .json(
          new ApiResponse(200, result, "VideoComments fetched  successfully!!")
        );
    })
    .catch((error) => {
      throw new ApiError(
        500,
        "something went wrong while fetching video Comments",
        error
      );
    });
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
    const { commentId } = req.params;
    if (!commentId?.trim() || !isValidObjectId(commentId)) {
      throw new ApiError(400, "commentId is required or invalid");
    }

    const content = req.body?.content?.trim();
    if (!content) {
      throw new ApiError(400, "Comment text is required to update comment");
    }

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $set: {
          content,
        },
      },
      { new: true }
    );
    if (!comment) {
      throw new ApiError(500, "Something went wrong while updating comment");
    }

    res
      .status(200)
      .json(new ApiResponse(200, comment, "Comment update success"));
  } catch (e) {
    throw new ApiError(400, e.message || "Not able to update a comment");
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  try {
    const { commentId } = req.params;
    const deleteComments = await Comment.findByIdAndDelete(commentId);
    if (!deleteComments) throw new ApiError(500, "Something went wrong");
    return res
      .status(200)
      .json(new ApiResponse(200, { deleteComments }, "Success"));
  } catch (e) {
    throw new ApiError(400, e.message || "Not able to delete a comment");
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
