#ifndef BT_NODES_HPP
#define BT_NODES_HPP

#include <concepts>
#include <tuple>

namespace BT {

template <typename Node, typename... Context>
concept HasUpdate = requires(Node n, Context &&...ctx) {
                      { n.Tick(ctx...) } -> std::same_as<bool>;
                    };

template <typename MyNode> struct DecoratorNode {
protected:
  explicit DecoratorNode(MyNode node) : _node(std::move(node)) {}

  MyNode _node;
};

template <typename MyNode> struct InvertNode : DecoratorNode<MyNode> {
  InvertNode() : DecoratorNode<MyNode>(MyNode()) {}

  template <typename... Context>
    requires HasUpdate<MyNode, Context...> bool
  Tick(Context &&...ctx) {
    return !this->_node.Tick(std::forward<Context>(ctx)...);
  }
};

template <typename MyNode> struct RepeatNode : DecoratorNode<MyNode> {
  RepeatNode() : DecoratorNode<MyNode>(MyNode()) {}

  template <typename... Context>
    requires HasUpdate<MyNode, Context...> bool
  Tick(Context &&...ctx) {
    while (this->_node.Tick(std::forward<Context>(ctx)...)) {
      // continue running node until it fails
    }
    return true;
  }
};

template <typename MyNode> struct RetryNode : DecoratorNode<MyNode> {
  RetryNode() : DecoratorNode<MyNode>(MyNode()) {}

  template <typename... Context>
    requires HasUpdate<MyNode, Context...> bool
  Tick(Context &&...ctx) {
    while (!this->_node.Tick(std::forward<Context>(ctx)...)) {
      // continue running node until it succeeds
    }
    return true;
  }
};

template <typename... Children> struct SelectorNode {

  template <typename... Context>
    requires(HasUpdate<Children, Context...> && ...) bool
  Tick(Context &&...ctx) {
    bool value = false;
    std::apply(
        [&](auto &&...kids) {
          ((value = kids.Tick(std::forward<Context>(ctx)...)) || ...);
        },
        _children);
    return value;
  }

private:
  std::tuple<Children...> _children;
};

template <typename... Children> struct SequenceNode {
  template <typename... Context>
    requires(HasUpdate<Children, Context...> && ...) bool
  Tick(Context &&...ctx) {
    bool value = true;
    std::apply(
        [&](auto &&...kids) {
          ((value = kids.Tick(std::forward<Context>(ctx)...)) && ...);
        },
        _children);
    return value;
  }

private:
  std::tuple<Children...> _children;
};

template <typename... Children> struct ParallelNode {
  template <typename... Context>
    requires(HasUpdate<Children, Context...> && ...) bool
  Tick(Context &&...ctx) {
    std::apply(
        [&](auto &&...kids) {
          ((kids.Tick(std::forward<Context>(ctx)...)), ...);
        },
        _children);
    return true;
  }

private:
  std::tuple<Children...> _children;
};
} // namespace BT

#endif